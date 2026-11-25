import type { z } from "zod";
import { neonDatabase } from "@/integrations/neon/database.server";
import { neonIdentity } from "@/integrations/neon/identity.server";
import { hashCode, isWellFormedCode, normalizeCode, sha256Hex } from "./crypto";
import { broadAreaLabel, PILOT_COUNTRIES, workspaceFor } from "./locations";
import type { pilotSubmitSchema } from "./pilot-schema";
import type { TimeBucket } from "./types";

type ReceiptAction = "open" | "message" | "removal";

interface Report {
  id: string;
  workspace: string;
  body: Record<string, unknown>;
  received_at: Date;
  removal_requested_at: Date | null;
}

export async function submitNeonPilot(input: z.infer<typeof pilotSubmitSchema>, request: Request) {
  const identity = await neonIdentity(request);
  if (!identity) throw new Error("Sign in as an invited tester.");
  const testers = (process.env["WHISPERS_PILOT_TESTER_IDS"] ?? "").split(",").map((id) => id.trim());
  if (!testers.includes(identity.subject)) throw new Error("Connected intake is available to invited testers only.");
  const db = neonDatabase();

  const payload = input.payload;
  const area = PILOT_COUNTRIES.find((country) => country.code === payload.countryCode);
  if (payload.areaId !== "unknown" && !area?.areas.some((item) => item.id === payload.areaId)) {
    throw new Error("Select a matching broad area.");
  }
  const payloadHash = await sha256Hex(JSON.stringify(payload) + input.codeHash);
  const accepted = await db.begin(async (sql) => {
    const [actor] = await sql<{ id: string }[]>`
      insert into auth.users (issuer, subject, email, email_confirmed_at)
      select ${identity.issuer}, id::text, lower(email), now()
      from neon_auth."user"
      where id::text=${identity.subject} and "emailVerified" is true and email is not null
      on conflict (issuer, subject) do update
        set email=excluded.email, email_confirmed_at=excluded.email_confirmed_at
      returning id
    `;
    if (!actor) throw new Error("A verified Neon Auth account is required.");
    await sql`select pg_advisory_xact_lock(hashtextextended(${input.idempotencyKey}, 0))`;
    const [prior] = await sql<{ payload_hash: string }[]>`
      select payload_hash from public.whispers_reports where idempotency_key=${input.idempotencyKey}
    `;
    if (prior) {
      if (prior.payload_hash !== payloadHash) throw new Error("This submission conflicts with an earlier draft.");
      return true;
    }
    const [quota] = await sql<{ allowed: boolean }[]>`
      select public.whispers_reserve_pilot_quota(${"intake:" + actor.id}, 6, 3600) as allowed
    `;
    if (!quota?.allowed) return false;
    const workspace = workspaceFor(payload.countryCode);
    const body = { ...payload, processingState: "received", evidenceState: "unassessed",
      sensitivity: payload.category === "safety" || payload.category === "aid_concern" ? "restricted" : "standard",
      fictional: true };
    const [report] = await sql<{ id: string }[]>`
      insert into public.whispers_reports (workspace, body, code_hash, idempotency_key, payload_hash)
      values (${workspace}, ${sql.json(body)}, ${input.codeHash}, ${input.idempotencyKey}, ${payloadHash}) returning id
    `;
    if (!report) throw new Error("Report was not saved.");
    await sql`insert into public.whispers_audit (action, workspace, target_id)
      values ('pilot_submit', ${workspace}, ${report.id})`;
    return true;
  });
  if (!accepted) throw new Error("Submission limit reached. Please try later.");
  return { accepted: true as const };
}

export async function receiptNeonPilot(data: { code: string; action: ReceiptAction; text?: string | undefined }) {
  const normalized = normalizeCode(data.code);
  if (!isWellFormedCode(normalized)) return null;
  const hash = await hashCode(normalized);
  const db = neonDatabase();
  const [report] = await db<Report[]>`select id, workspace, body, received_at, removal_requested_at
    from public.whispers_reports where code_hash=${hash} and revoked_at is null and expires_at > now()`;
  if (!report) return null;

  const quotaKey = data.action === "open" ? "receipt" : data.action;
  const limit = data.action === "open" ? 30 : data.action === "message" ? 10 : 3;
  const [quota] = await db<{ allowed: boolean }[]>`
    select public.whispers_reserve_pilot_quota(${quotaKey + ":" + hash}, ${limit}, 3600) as allowed
  `;
  if (!quota?.allowed) return null;

  return db.begin(async (sql) => {
    const [active] = await sql<Report[]>`select id, workspace, body, received_at, removal_requested_at
      from public.whispers_reports where id=${report.id} and revoked_at is null and expires_at > now() for update`;
    if (!active) return null;

    if (data.action === "message") {
      const text = data.text?.trim();
      if (!text || active.removal_requested_at) throw new Error("Cannot add this message.");
      await sql`insert into public.whispers_records (report_id, workspace, kind, body)
        values (${active.id}, ${active.workspace}, 'message', ${sql.json({ text, sender: "contributor" })})`;
      await sql`insert into public.whispers_audit (action, workspace, target_id)
        values ('contributor_message', ${active.workspace}, ${active.id})`;
    }
    if (data.action === "removal") {
      const [requested] = await sql<{ ok: boolean }[]>`select public.whispers_request_removal(${active.id}) as ok`;
      if (!requested?.ok) return null;
    }
    const records = await sql<{ id: string; kind: string; body: Record<string, unknown>; created_at: Date }[]>`
      select id, kind, body, created_at from public.whispers_records
      where report_id=${active.id} and kind in ('message','photo') order by created_at
    `;
    return {
      text: String(active.body["text"] ?? ""),
      area: broadAreaLabel(String(active.body["countryCode"] ?? "not_shared"), String(active.body["areaId"] ?? "unknown")),
      time: String(active.body["timeBucket"] ?? "not_sure") as TimeBucket,
      receivedAt: active.received_at.toISOString(),
      state: String(active.body["processingState"] ?? "received"),
      removalRequested: data.action === "removal" || Boolean(active.removal_requested_at),
      messages: records.filter((record) => record.kind === "message").map((record) => ({
        id: record.id, text: String(record.body["text"] ?? ""), sender: String(record.body["sender"] ?? ""), at: record.created_at.toISOString(),
      })),
      photos: records.filter((record) => record.kind === "photo").length,
    };
  });
}

export async function uploadNeonPilot(data: { code: string; bytes: number[] | Uint8Array; uploadId: string }) {
  const normalized = normalizeCode(data.code);
  if (!isWellFormedCode(normalized)) throw new Error("Report unavailable.");
  const hash = await hashCode(normalized);
  const db = neonDatabase();
  const [report] = await db<{ id: string }[]>`
    select id from public.whispers_reports where code_hash=${hash} and revoked_at is null
      and removal_requested_at is null and expires_at > now()
  `;
  if (!report) throw new Error("Report unavailable.");
  const [prior] = await db`select id from public.whispers_records
    where report_id=${report.id} and upload_id=${data.uploadId}`;
  if (prior) return { ok: true };
  const [quota] = await db<{ allowed: boolean }[]>`
    select public.whispers_reserve_pilot_quota(${"upload:" + report.id}, 12, 3600) as allowed
  `;
  if (!quota?.allowed) throw new Error("Photo upload limit reached.");

  const { default: jpeg } = await import("jpeg-js");
  const decoded = jpeg.decode(data.bytes instanceof Uint8Array ? data.bytes : new Uint8Array(data.bytes), {
    useTArray: true, maxResolutionInMP: 3, maxMemoryUsageInMB: 32, tolerantDecoding: false,
  });
  if (decoded.width * decoded.height > 1600 * 1600) throw new Error("Photo is too large.");
  const encoded = jpeg.encode(decoded, 80).data;
  if (encoded.length > 1_500_000) throw new Error("Processed photo is too large.");
  const key = report.id + "/" + crypto.randomUUID() + ".jpg";

  // The sweep keeps a new object through its registration grace period. An
  // interrupted upload remains discoverable even if the transaction rolls back.
  await db`insert into public.whispers_media_cleanup (report_id) values (${report.id})
    on conflict (report_id) do update set queued_at=clock_timestamp()`;
  const { PutObjectCommand } = await import("@aws-sdk/client-s3");
  const { neonStorage, NEON_PHOTO_BUCKET } = await import("@/integrations/neon/storage.server");
  return db.begin(async (sql) => {
    const [active] = await sql<{ workspace: string; photo_count: number }[]>`
      select workspace, photo_count from public.whispers_reports where id=${report.id}
        and revoked_at is null and removal_requested_at is null and expires_at > now() for update
    `;
    if (!active) throw new Error("Report unavailable.");
    const [retry] = await sql`select id from public.whispers_records
      where report_id=${report.id} and upload_id=${data.uploadId}`;
    if (retry) return { ok: true };
    if (active.photo_count >= 3) throw new Error("At most three photos are permitted.");
    await neonStorage().send(new PutObjectCommand({
      Bucket: NEON_PHOTO_BUCKET, Key: key, Body: encoded, ContentType: "image/jpeg",
    }), { abortSignal: AbortSignal.timeout(10_000) });
    await sql`insert into public.whispers_records (report_id, workspace, kind, upload_id, body)
      values (${report.id}, ${active.workspace}, 'photo', ${data.uploadId},
      ${sql.json({ key, width: decoded.width, height: decoded.height, processed: "server-reencoded" })})`;
    return { ok: true };
  });
}
