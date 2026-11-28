import { readFile } from "node:fs/promises";
import { createHash } from "node:crypto";
import postgres from "postgres";

// Deliberately pinned to the Whispers production branch. Staging has its own
// separate migration runner, and this file requires a second explicit ack.
const productionBranchId = "br-cold-brook-bgwlm78b";
const connection = process.env.DATABASE_URL_UNPOOLED;
const branchId = process.env.NEON_BRANCH_ID;
const host = connection ? new URL(connection).hostname : "";
const apply = process.argv.includes("--apply");
if (process.env.NEON_BRANCH !== "production" || branchId !== productionBranchId ||
    process.env.WHISPERS_PRODUCTION_MIGRATION_ACK !== productionBranchId ||
    !host.endsWith(".neon.tech")) {
  throw new Error("Production migration blocked: exact branch identity and explicit acknowledgement are required.");
}

const migrations = [
  "drizzle/neon/0000_platform.sql",
  "drizzle/migrations/0000_voice_request_controls.sql",
  "drizzle/migrations/0001_connected_whispers_pilot.sql",
  "drizzle/neon/0002_retention.sql",
  "drizzle/migrations/0003_atomic_pilot_safeguards.sql",
  "drizzle/migrations/0004_workspace_staff_invitations.sql",
  "drizzle/migrations/0005_bounded_translation_and_voice_costs.sql",
  "drizzle/neon/0006_pilot_release_blockers.sql",
  "drizzle/neon/0007_private_photo.sql",
  "drizzle/neon/0008_record_guard.sql",
  "drizzle/neon/0009_staff_invitation_scope.sql",
  "drizzle/neon/0010_public_projection.sql",
  "drizzle/neon/0011_retention_status.sql",
  "drizzle/neon/0012_legacy_snapshot.sql",
  "drizzle/neon/0013_live_intake_release_gate.sql",
];
const aliases = new Map([
  ["drizzle/neon/0006_pilot_release_blockers.sql", "drizzle/proposed/0006_pilot_release_blockers.sql"],
]);
const sql = postgres(connection, { max: 1, ssl: "require" });
try {
  const columns = await sql`
    select column_name from information_schema.columns
    where table_schema='public' and table_name='whispers_schema_migrations'
  `;
  if (!columns.some(row => row.column_name === "name")) {
    throw new Error("Production migration ledger is missing; refusing to infer schema history.");
  }
  const hasChecksum = columns.some(row => row.column_name === "checksum");
  const rows = await sql`select name, ${hasChecksum ? sql`checksum` : sql`null::text as checksum`} from public.whispers_schema_migrations`;
  const recorded = new Map(rows.map(row => [row.name, row.checksum]));
  const [tables] = await sql`select to_regclass('public.whispers_reports') is not null as present`;
  if (!tables.present || recorded.size === 0) {
    throw new Error("Production data exists without a verifiable migration ledger; refusing changes.");
  }

  const pending = [];
  for (const path of migrations) {
    const contents = await readFile(new URL(`../${path}`, import.meta.url), "utf8");
    const checksum = createHash("sha256").update(contents).digest("hex");
    const oldPath = recorded.has(path) ? path : aliases.get(path);
    if (oldPath && recorded.has(oldPath)) {
      const prior = recorded.get(oldPath);
      if (prior && prior !== checksum) throw new Error(`Applied migration changed after deployment: ${oldPath}`);
      continue;
    }
    pending.push({ path, contents, checksum });
  }
  const expectedRecorded = migrations.slice(0, 13).every(path => recorded.has(path) || (aliases.has(path) && recorded.has(aliases.get(path))));
  if (!expectedRecorded) throw new Error("Production migration history has gaps; refusing to guess the deployed schema.");

  console.log(JSON.stringify({ target: "Whispers production", branchId, pending: pending.map(item => item.path), mode: apply ? "apply" : "dry-run" }));
  if (apply) {
    await sql.begin(async tx => {
      await tx`select pg_advisory_xact_lock(521308882)`;
      await tx`alter table public.whispers_schema_migrations add column if not exists checksum text`;
      const current = new Map((await tx`select name, checksum from public.whispers_schema_migrations`).map(row => [row.name, row.checksum]));
      for (const path of migrations) {
        const contents = await readFile(new URL(`../${path}`, import.meta.url), "utf8");
        const checksum = createHash("sha256").update(contents).digest("hex");
        const recordedPath = current.has(path) ? path : aliases.get(path);
        if (recordedPath && current.has(recordedPath)) {
          if (current.get(recordedPath) === null) {
            await tx`update public.whispers_schema_migrations set checksum=${checksum} where name=${recordedPath} and checksum is null`;
          }
          continue;
        }
        await tx.unsafe(contents).simple();
        await tx`insert into public.whispers_schema_migrations (name, checksum) values (${path}, ${checksum})`;
        console.log(`Applied ${path}`);
      }
    });
    console.log("Production migration transaction committed.");
  }
} finally {
  await sql.end();
}
