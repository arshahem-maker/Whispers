import { readFile } from "node:fs/promises";
import { randomUUID } from "node:crypto";
import postgres from "postgres";

const [path] = process.argv.slice(2);
if (!path) throw new Error("Pass the local JSON export path.");

const expectedBranchId = process.env["WHISPERS_STAGING_NEON_BRANCH_ID"];
if (!expectedBranchId || process.env["NEON_BRANCH"] !== "main" ||
    process.env["NEON_BRANCH_ID"] !== expectedBranchId) {
  throw new Error("Legacy snapshots may only be stored on the explicitly configured staging branch.");
}
const connection = process.env["DATABASE_URL_UNPOOLED"];
if (!connection || !new URL(connection).hostname.endsWith(".neon.tech")) {
  throw new Error("A Neon staging database connection is required.");
}

const contents = await readFile(path, "utf8");
if (Buffer.byteLength(contents, "utf8") > 10_000_000) throw new Error("Legacy snapshot exceeds the 10 MB limit.");
const payload = JSON.parse(contents);
const tables = [
  "user_roles", "whispers_reports", "whispers_records", "whispers_expert_requests",
  "whispers_expert_assignments", "whispers_expert_responses", "whispers_updates",
  "whispers_release", "whispers_release_reviews", "whispers_staff_invitations",
  "whispers_audit", "whispers_media_cleanup", "whispers_interface_translations",
];
for (const name of [...tables, "account_mapping", "file_manifest"]) {
  if (!Array.isArray(payload[name])) throw new Error(`Legacy snapshot is missing ${name}.`);
}
if (payload.whispers_reports.some(report => report.body?.fictional !== true)) {
  throw new Error("Snapshot contains a report not explicitly marked fictional; no source records were stored.");
}

const snapshotId = randomUUID();
const db = postgres(connection, { max: 1, ssl: "require" });
try {
  await db`insert into whispers_legacy_import.snapshots (id, source_payload)
    values (${snapshotId}, ${db.json(payload)})`;
  console.log(JSON.stringify({
    snapshotId,
    reports: payload.whispers_reports.length,
    records: payload.whispers_records.length,
    privatePhotosExpected: payload.file_manifest.length,
    legacyAccounts: payload.account_mapping.length,
    translations: payload.whispers_interface_translations.length,
  }));
} finally {
  await db.end();
}
