import { HeadObjectCommand, S3Client } from "@aws-sdk/client-s3";
import postgres from "postgres";

const apply = process.argv.includes("--apply");
const databaseUrl = process.env.DATABASE_URL_UNPOOLED;
const storageEndpoint = process.env.AWS_ENDPOINT_URL_S3;
const authBaseUrl = process.env.NEON_AUTH_BASE_URL;
const rehearsal = process.argv.includes("--rehearse");
const endpoints = [databaseUrl, storageEndpoint, authBaseUrl].map(value => value ? new URL(value) : null);
const loopback = endpoint => endpoint?.hostname === "127.0.0.1";
const hosted = endpoint => endpoint?.hostname.endsWith(".neon.tech");
if (rehearsal ? !endpoints.every(loopback) : !endpoints.every(hosted)) {
  throw new Error("Use the same Neon branch for database, storage, and Auth. Rehearsals require loopback endpoints.");
}
if (!rehearsal && endpoints[0].hostname.split(".")[0] !== endpoints[2].hostname.split(".")[0]) {
  throw new Error("The direct database endpoint and Auth endpoint disagree.");
}
const issuer = endpoints[2].origin;
const db = postgres(databaseUrl, { max: 1, ssl: rehearsal ? false : "require" });
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
  const photos = records.filter(record => record.kind === "photo");
  const photoKeys = new Set(photos.map(record => record.body?.key));
  if (manifest.size !== payload.file_manifest.length || photos.length !== photoKeys.size ||
      photoKeys.size !== manifest.size || photos.some(record =>
        typeof record.body?.key !== "string" || !manifest.has(record.body.key) ||
        !record.body.key.startsWith(record.report_id + "/"))) {
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
    const applied = await db.begin(async sql => {
      await sql`select pg_advisory_xact_lock(521308883)`;
      await sql`create table if not exists whispers_legacy_import.activated_snapshots (
        snapshot_id uuid primary key references whispers_legacy_import.snapshots(id),
        activated_at timestamptz not null default now()
      )`;
      await sql`revoke all on table whispers_legacy_import.activated_snapshots from public, anon, authenticated, service_role`;
      const [done] = await sql`select 1 from whispers_legacy_import.activated_snapshots where snapshot_id=${snapshot.id}`;
      if (done) return false;
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
      return true;
    });
    console.log(applied ? "Snapshot activation verified." : "Snapshot already activated.");
  } else {
    console.log("Preflight passed. Use --apply to activate the verified snapshot.");
  }
} finally {
  storage.destroy();
  await db.end();
}
