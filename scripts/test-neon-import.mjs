import assert from "node:assert/strict";
import { execFile } from "node:child_process";
import { randomUUID } from "node:crypto";
import { createServer } from "node:http";
import { promisify } from "node:util";
import postgres from "postgres";

const run = promisify(execFile);
const [container] = process.argv.slice(2);
const target = new URL(process.env.DATABASE_URL_UNPOOLED ?? "");
assert.equal(target.hostname, "127.0.0.1");
assert.equal(target.password, "whispers-disposable");
const db = postgres(target.href, { ssl: false });
const [reportId, recordId, userId, snapshotId] = Array.from({ length: 4 }, randomUUID);
const key = reportId + "/" + recordId + ".jpg";
let photoPresent = false;
const storage = createServer((request, response) => {
  const found = photoPresent && request.method === "HEAD" && request.url?.split("?")[0] === "/whispers-private/" + key;
  response.writeHead(found ? 200 : 404, found ? { "Content-Type": "image/jpeg", "Content-Length": "12" } : {});
  response.end();
});
await new Promise(resolve => storage.listen(0, "127.0.0.1", resolve));
const origin = "http://127.0.0.1:" + storage.address().port;
const env = {
  ...process.env, NEON_AUTH_BASE_URL: origin, AWS_ENDPOINT_URL_S3: origin,
  AWS_REGION: "us-east-1", AWS_ACCESS_KEY_ID: "fixture", AWS_SECRET_ACCESS_KEY: "fixture",
  AWS_SESSION_TOKEN: "",
};
const importer = (...args) => run(process.execPath, ["scripts/import-neon-legacy.mjs", "--rehearse", ...args], { env });

try {
  await db`create schema neon_auth`;
  await db`create table neon_auth."user" (id text primary key, email text not null, "emailVerified" boolean not null)`;
  const received = new Date().toISOString();
  const expires = new Date(Date.now() + 86_400_000).toISOString();
  await db`insert into neon_auth."user" values ('fixture','user@example.invalid',true)`;
  const payload = {
    account_mapping: [{ id: userId, email: "user@example.invalid", email_confirmed_at: received }],
    file_manifest: [{ name: key }],
    user_roles: [{ user_id: userId, role: "reviewer", contexts: ["ua"], active: true }],
    whispers_reports: [{
      id: reportId, workspace: "ua", body: { fictional: true }, code_hash: "a".repeat(64),
      idempotency_key: reportId, payload_hash: "b".repeat(64), received_at: received,
      expires_at: expires, version: 0, photo_count: 1,
    }],
    whispers_records: [{
      id: recordId, report_id: reportId, workspace: "ua", kind: "photo", body: { key }, created_at: received,
    }],
    whispers_expert_requests: [], whispers_expert_assignments: [], whispers_expert_responses: [],
    whispers_updates: [], whispers_release: [], whispers_release_reviews: [],
    whispers_staff_invitations: [], whispers_audit: [], whispers_media_cleanup: [],
    whispers_interface_translations: [{ language: "fr", catalog_hash: "c".repeat(32), batch_offset: 0,
      phrases: { "Updates": "Mises à jour" }, status: "ready", claimed_at: received }],
  };
  await db`insert into whispers_legacy_import.snapshots (id, source_payload) values (${snapshotId},${db.json(payload)})`;
  await assert.rejects(importer(), error => error.code === 2 && error.stdout.includes('"privatePhotosFound":0'));
  await assert.rejects(importer("--apply"), /Preflight blocked activation/);
  photoPresent = true;
  const check = await importer();
  assert.match(check.stdout, /Preflight passed/);

  // Cause a late failure to prove the transaction rolls back earlier inserts.
  payload.whispers_audit.push({ id: randomUUID(), action: "fixture", workspace: null, at: received, outcome: "ok" });
  await db`update whispers_legacy_import.snapshots set source_payload=${db.json(payload)} where id=${snapshotId}`;
  await assert.rejects(importer("--apply"), /null value|not-null constraint/);
  const [rolledBack] = await db`select
    (select count(*)::int from public.whispers_reports) as reports,
    (select count(*)::int from auth.users) as users,
    (select count(*)::int from public.whispers_interface_translations) as translations`;
  assert.deepEqual(rolledBack, { reports: 0, users: 0, translations: 0 });
  payload.whispers_audit = [];
  await db`update whispers_legacy_import.snapshots set source_payload=${db.json(payload)} where id=${snapshotId}`;
  assert.match((await importer("--apply")).stdout, /Snapshot activation verified/);
  assert.match((await importer("--apply")).stdout, /Snapshot already activated/);
  const [translationCount] = await db`select count(*)::int as count from public.whispers_interface_translations`;
  assert.equal(translationCount.count, 0, "stale, rebuildable translation cache is not activated");

  await run("docker", ["exec", container, "pg_dump", "-U", "postgres", "-Fc", "-f", "/tmp/whispers.dump", "postgres"]);
  await run("docker", ["exec", container, "createdb", "-U", "postgres", "whispers_restore"]);
  await run("docker", ["exec", container, "pg_restore", "-U", "postgres", "--exit-on-error", "-d", "whispers_restore", "/tmp/whispers.dump"]);
  const restoredUrl = new URL(target);
  restoredUrl.pathname = "/whispers_restore";
  const restored = postgres(restoredUrl.href, { ssl: false });
  try {
    const [row] = await restored`select r.photo_count, a.subject, p.body->>'key' as key
      from whispers_reports r join whispers_records p on p.report_id=r.id
      join user_roles u on u.role='reviewer' join auth.users a on a.id=u.user_id
      where r.id=${reportId} and p.id=${recordId}`;
    assert.deepEqual(row, { photo_count: 1, subject: "fixture", key });
    const [ledger] = await restored`select snapshot_id from whispers_legacy_import.activated_snapshots`;
    assert.equal(ledger.snapshot_id, snapshotId);
    const [restoredTranslationCount] = await restored`select count(*)::int as count from public.whispers_interface_translations`;
    assert.equal(restoredTranslationCount.count, 0);
  } finally {
    await restored.end();
  }
  console.log("Neon import rehearsal passed: missing photo rejection, atomic rollback, verified owner mapping, idempotent activation, database backup and restore.");
} finally {
  await db.end();
  storage.close();
}
