import { requireStagingTarget } from "./staging-target.mjs";
import { readFile } from "node:fs/promises";
import { createHash } from "node:crypto";
import postgres from "postgres";

const migrations = [
  "drizzle/neon/0000_platform.sql",
  "drizzle/migrations/0000_voice_request_controls.sql",
  "drizzle/migrations/0001_connected_whispers_pilot.sql",
  "drizzle/neon/0002_retention.sql",
  "drizzle/migrations/0003_atomic_pilot_safeguards.sql",
  "drizzle/migrations/0004_workspace_staff_invitations.sql",
  "drizzle/migrations/0005_bounded_translation_and_voice_costs.sql",
  "drizzle/proposed/0006_pilot_release_blockers.sql",
  "drizzle/neon/0007_private_photo.sql",
  "drizzle/neon/0008_record_guard.sql",
  "drizzle/neon/0009_staff_invitation_scope.sql",
  "drizzle/neon/0010_public_projection.sql",
  "drizzle/neon/0011_retention_status.sql",
  "drizzle/neon/0012_legacy_snapshot.sql",
];

const connection = process.env.DATABASE_URL_UNPOOLED;
if (!connection) throw new Error("DATABASE_URL_UNPOOLED is required for migrations.");
const host = new URL(connection).hostname;
if (!host.endsWith(".neon.tech") && host !== "127.0.0.1" && host !== "localhost") {
  throw new Error("Expected a Neon or loopback PostgreSQL database.");
}
if (host.endsWith(".neon.tech")) requireStagingTarget("database", connection);
const sql = postgres(connection, { max: 1, ...(host.endsWith(".neon.tech") ? { ssl: "require" } : {}) });

try {
  const applied = await sql.begin(async (transaction) => {
    await transaction`select pg_advisory_xact_lock(521308882)`;
    await transaction`
      create table if not exists public.whispers_schema_migrations (
        name text primary key,
        checksum text,
        applied_at timestamptz not null default now()
      )
    `;
    await transaction`alter table public.whispers_schema_migrations add column if not exists checksum text`;
    const recorded = new Map((await transaction`select name, checksum from public.whispers_schema_migrations`).map(({ name, checksum }) => [name, checksum]));
    const [existing] = await transaction`select to_regclass('public.whispers_reports') is not null as present`;
    if (existing.present && recorded.size === 0) {
      throw new Error("Whispers tables exist without a migration record. Check the existing schema before applying migrations.");
    }
    const completed = [];
    for (const path of migrations) {
      const statement = await readFile(new URL(`../${path}`, import.meta.url), "utf8");
      const checksum = createHash("sha256").update(statement).digest("hex");
      if (recorded.has(path)) {
        const priorChecksum = recorded.get(path);
        if (priorChecksum && priorChecksum !== checksum) {
          throw new Error(`Applied migration changed after deployment: ${path}`);
        }
        // Existing records predate checksums. Pin their current contents once,
        // then reject any future edits to an applied migration.
        if (!priorChecksum) {
          await transaction`update public.whispers_schema_migrations set checksum=${checksum} where name=${path} and checksum is null`;
        }
        continue;
      }
      await transaction.unsafe(statement).simple();
      await transaction`insert into public.whispers_schema_migrations (name, checksum) values (${path}, ${checksum})`;
      completed.push(path);
    }
    return completed;
  });
  for (const path of applied) console.log("Applied", path);
  console.log(`Whispers migrations complete (${applied.length} new).`);
} catch (error) {
  console.error("Whispers migration failed:", error.code ?? error.message);
  process.exitCode = 1;
} finally {
  await sql.end();
}
