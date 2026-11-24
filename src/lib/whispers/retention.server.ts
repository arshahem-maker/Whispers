import { supabaseAdmin as admin } from "@/integrations/supabase/client.server";

export async function runRetention() {
  const expired = await admin.rpc("whispers_expire_private");
  if (expired.error) throw new Error("Private record cleanup failed.");
  const queue = await admin.from("whispers_media_cleanup").select("report_id,queued_at").order("queued_at").limit(100);
  if (queue.error) throw new Error("Media cleanup lookup failed.");
  let failed = 0;
  for (const r of queue.data ?? []) {
    try {
      const report = await admin.from("whispers_reports").select("revoked_at").eq("id", r.report_id).maybeSingle();
      if (report.error) throw new Error("Media cleanup lookup failed.");
      const registered = await admin.from("whispers_records").select("body").eq("report_id", r.report_id).eq("kind", "photo");
      if (registered.error) throw new Error("Media cleanup lookup failed.");
      const keep = new Set(registered.data.map((photo) => photo.body && typeof photo.body === "object" && !Array.isArray(photo.body) ? String(photo.body["key"] ?? "") : ""));
      const oldestInFlight = Date.now() - 24 * 60 * 60 * 1000;
      const revokedAt = report.data?.revoked_at;
      let retry = !!revokedAt && Date.parse(revokedAt) > oldestInFlight;
      const keys: string[] = [];

      for (let offset = 0; ; offset += 100) {
        const files = await admin.storage.from("whispers-private").list(r.report_id, { limit: 100, offset, sortBy: { column: "name", order: "asc" } });
        if (files.error) throw new Error("Private media cleanup failed.");
        for (const file of files.data) {
          const key = r.report_id + "/" + file.name;
          if (keep.has(key)) continue;
          if (!revokedAt && !(Date.parse(file.created_at ?? "") <= oldestInFlight)) { retry = true; continue; }
          keys.push(key);
        }
        if (files.data.length < 100) break;
      }
      for (let offset = 0; offset < keys.length; offset += 100) {
        const removed = await admin.storage.from("whispers-private").remove(keys.slice(offset, offset + 100));
        if (removed.error) throw new Error("Private media cleanup failed.");
      }
      const completed = retry
        ? await admin.from("whispers_media_cleanup").update({ queued_at: new Date().toISOString() }).eq("report_id", r.report_id).eq("queued_at", r.queued_at)
        : await admin.from("whispers_media_cleanup").delete().eq("report_id", r.report_id).eq("queued_at", r.queued_at);
      if (completed.error) throw new Error("Media cleanup completion failed.");
    } catch {
      // One unavailable object must not starve every later cleanup job.
      failed += 1;
      await admin.from("whispers_media_cleanup").update({ queued_at: new Date().toISOString() }).eq("report_id", r.report_id).eq("queued_at", r.queued_at);
    }
  }
  const limits = await admin.from("voice_request_limits").delete().lt("started_at", new Date(Date.now() - 86400000).toISOString());
  if (limits.error) throw new Error("Request metadata cleanup failed.");
  const purge = await (admin.rpc as unknown as (name: string) => Promise<{ error: unknown }>)("whispers_purge_pilot_limits");
  if (purge.error) throw new Error("Pilot quota cleanup failed.");
  if (failed) throw new Error("Some private media cleanup jobs need retrying.");
  return { ok: true, expired: expired.data };
}