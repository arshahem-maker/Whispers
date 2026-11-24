import { HeadObjectCommand, S3Client } from "@aws-sdk/client-s3";
import postgres from "postgres";

const apply = process.argv.includes("--apply");
const databaseUrl = process.env.DATABASE_URL_UNPOOLED;
const storageEndpoint = process.env.AWS_ENDPOINT_URL_S3;
const authBaseUrl = process.env.NEON_AUTH_BASE_URL;
if (!databaseUrl || !storageEndpoint || !authBaseUrl
  || ![databaseUrl, storageEndpoint, authBaseUrl].every(value => new URL(value).hostname.endsWith(".neon.tech"))) {
  throw new Error("Run with the same Neon branch's database, storage, and Auth configuration.");
}
const issuer = new URL(authBaseUrl).origin;
const db = postgres(databaseUrl, { max: 1, ssl: "require" });
const storage = new S3Client({ endpoint: storageEndpoint, region: process.env.AWS_REGION, forcePathStyle: true });

const tables = [
  "user_roles", "whispers_reports", "whispers_records", "whispers_expert_requests",
  "whispers_expert_assignments", "whispers_expert_responses", "whispers_updates",
  "whispers_release", "whispers_release_reviews", "whispers_staff_invitations",
  "whispers_audit", "whispers_media_cleanup",
];

try {
  const [snapshot] = await db`select id, source_payload from whispers_legacy_import.snapshots
    order by imported_at desc limit 1`;
  if (!snapshot) throw new Error("No private migration snapshot is available.");
  const payload = snapshot.source_payload;
  for (const name of [...tables, "account_mapping", "file_manifest"]) {
    if (!Array.isArray(payload[name])) throw new Error("The migration snapshot is incomplete.");
  }

  const manifest = new Set(payload.file_manifest.map(entry => entry.name));
  const records = payload.whispers_records;
  const reports = payload.whispers_reports;
  const photoKeys = records.filter(record => record.kind === "photo").map(record => record.body?.key);
  if (photoKeys.some(key => !manifest.has(key)) || photoKeys.length !== manifest.size) {
    throw new Error("The snapshot photo records and storage manifest disagree.");
  }
  let missing = 0;
  for (const key of manifest) {
    if (typeof key !== "string" || !/^[0-9a-f-]{36}\/[0-9a-f-]{36}\.jpg$/i.test(key)) {
      throw new Error("Unexpected photo path in the snapshot.");
    }
    try {
      const object = await storage.send(new HeadObjectCommand({ Bucket: "whispers-private", Key: key }));
      if (object.ContentType !== "image/jpeg" || !object.ContentLength) {
        throw new Error("Copied photo has unexpected properties.");
      }
    } catch (error) {
      if (error.$metadata?.httpStatusCode !== 404) throw error;
      missing++;
    }
  }

  const mappings = [];
  let unmapped = 0;
  for (const legacy of payload.account_mapping) {
    const targets = legacy.email_confirmed_at && legacy.email
      ? await db`select id from neon_auth."user"
          where lower(email)=lower(${legacy.email}) and "emailVerified" is true`
      : [];
    if (targets.length !== 1) {
      unmapped++;
      continue;
    }
    mappings.push({ id: legacy.id, issuer, subject: targets[0].id, email: legacy.email,
      email_confirmed_at: legacy.email_confirmed_at });
  }
  const activeIds = new Set(reports.filter(report =>
    !report.revoked_at && !report.removal_requested_at && Date.parse(report.expires_at) > Date.now()
  ).map(report => report.id));
  const historicalRecords = records.filter(record => !activeIds.has(record.report_id)).length;

  console.log(JSON.stringify({
    reports: reports.length, privatePhotosExpected: manifest.size, privatePhotosFound: manifest.size - missing,
    legacyAccounts: payload.account_mapping.length, accountsMapped: mappings.length, historicalRecords,
  }));
  if (missing || unmapped || historicalRecords) {
    if (apply) throw new Error("Preflight blocked activation. Copy missing photos and verify legacy identities first.");
    process.exitCode = 2;
  } else if (apply) {
    await db.begin(async sql => {
      await sql`select pg_advisory_xact_lock(521308883)`;
      await sql`create table if not exists whispers_legacy_import.activated_snapshots (
        snapshot_id uuid primary key references whispers_legacy_import.snapshots(id),
        activated_at timestamptz not null default now()
      )`;
      await sql`revoke all on table whispers_legacy_import.activated_snapshots from public, anon, authenticated, service_role`;
      const [done] = await sql`select 1 from whispers_legacy_import.activated_snapshots where snapshot_id=${snapshot.id}`;
      if (done) return;
      const [latest] = await sql`select id from whispers_legacy_import.snapshots order by imported_at desc limit 1`;
      if (latest?.id !== snapshot.id) throw new Error("The source snapshot changed. Run preflight again.");
      for (const name of tables) {
        await sql`lock table ${sql("public." + name)} in share row exclusive mode`;
        const [occupied] = await sql`select exists(select 1 from ${sql("public." + name)}) as present`;
        if (occupied.present) throw new Error(`Target table ${name} already contains records. Reconcile before importing.`);
      }
      for (const identity of mappings) {
        const [verified] = await sql`select id from neon_auth."user" where id::text=${identity.subject}
          and lower(email)=lower(${identity.email}) and "emailVerified" is true for share`;
        if (!verified) throw new Error("A verified staff identity changed. Run preflight again.");
        await sql`insert into auth.users ${sql(identity)}`;
      }
      for (const name of tables) {
        const rows = name === "whispers_reports"
          ? payload[name].map(report => ({ ...report, photo_count: 0 }))
          : payload[name];
        if (rows.length === 0) continue;
        const target = sql("public." + name);
        const inserted = await sql`insert into ${target}
          select * from jsonb_populate_recordset(null::${target}, ${sql.json(rows)}::jsonb)`;
        if (inserted.count !== rows.length) throw new Error(`Count mismatch importing ${name}.`);
      }
      await sql`insert into whispers_legacy_import.activated_snapshots (snapshot_id) values (${snapshot.id})`;
    });
    console.log("Snapshot activation verified.");
  } else {
    console.log("Preflight passed. Use --apply to activate the verified snapshot.");
  }
} finally {
  storage.destroy();
  await db.end();
}
