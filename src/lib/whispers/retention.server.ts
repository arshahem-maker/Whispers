import { supabaseAdmin as admin } from "@/integrations/supabase/client.server";

export async function runRetention() {
  const expired = await admin.rpc("whispers_expire_private");
  if (expired.error) throw new Error("Private record cleanup failed.");
  const queue = await admin.from("whispers_media_cleanup").select("report_id").order("queued_at").limit(100);
  if (queue.error) throw new Error("Media cleanup lookup failed.");
  let failed = 0;
  for (const r of queue.data ?? []) {
    try {
    const registered = await admin.from("whispers_records").select("body").eq("report_id", r.report_id).eq("kind", "photo");
    if (registered.error) throw new Error("Media cleanup lookup failed.");
    const keep = new Set(registered.data.map((p) => p.body && typeof p.body === "object" && !Array.isArray(p.body) ? String(p.body['key'] ?? "") : ""));
    const keys: string[] = [];
    for (let offset = 0; ; offset += 100) {
      const files = await admin.storage.from("whispers-private").list(r.report_id, { limit: 100, offset });
      if (files.error) throw new Error("Private media cleanup failed.");
      keys.push(...files.data.map((f) => r.report_id + "/" + f.name).filter((key) => !keep.has(key)));
      if (files.data.length < 100) break;
    }
    if (keys.length) {
      const removed = await admin.storage.from("whispers-private").remove(keys);
      if (removed.error) throw new Error("Private media cleanup failed.");
    }
    // Retain tombstones for retrying late uploads after revocation; active orphan jobs can finish.
    const report = await admin.from("whispers_reports").select("revoked_at").eq("id", r.report_id).maybeSingle();
    if (report.error) throw new Error("Media cleanup lookup failed.");
    if (!report.data?.revoked_at) {
      const done = await admin.from("whispers_media_cleanup").delete().eq("report_id", r.report_id);
      if (done.error) throw new Error("Media cleanup completion failed.");
    } else {
      // Rotate retained tombstones so the first 100 cannot starve later cleanup jobs.
      const rotated = await admin.from("whispers_media_cleanup").update({ queued_at: new Date().toISOString() }).eq("report_id", r.report_id);
      if (rotated.error) throw new Error("Media cleanup completion failed.");
    }
    } catch {
      // One unavailable object must not starve every later cleanup job.
      failed += 1;
      await admin.from("whispers_media_cleanup").update({ queued_at: new Date().toISOString() }).eq("report_id", r.report_id);
    }
  }
  const limits = await admin.from("voice_request_limits").delete().lt("started_at", new Date(Date.now() - 86400000).toISOString());
  if (limits.error) throw new Error("Request metadata cleanup failed.");
  if (failed) throw new Error("Some private media cleanup jobs need retrying.");
  return { ok: true, expired: expired.data };
}