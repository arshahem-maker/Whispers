import { DeleteObjectsCommand, ListObjectsV2Command } from "@aws-sdk/client-s3";
import { neonDatabase } from "@/integrations/neon/database.server";
import { NEON_PHOTO_BUCKET, neonStorage } from "@/integrations/neon/storage.server";

interface CleanupJob {
  report_id: string;
  queued_at: string;
  revoked_at: Date | null;
}
const graceMs = 86_400_000;

function cleanupReady(job: CleanupJob, now: number) {
  const eligibleAt = job.revoked_at?.getTime() ?? Date.parse(job.queued_at);
  return Number.isFinite(eligibleAt) && eligibleAt <= now - graceMs;
}

export async function runNeonRetention() {
  const db = neonDatabase();
  const [result] = await db<{ expired: number }[]>`select public.whispers_expire_private() as expired`;
  const jobs = await db<CleanupJob[]>`
    select job.report_id, job.queued_at::text, report.revoked_at
    from public.whispers_media_cleanup job
    left join public.whispers_reports report on report.id=job.report_id
    where (report.revoked_at is not null and report.revoked_at <= now() - interval '1 day')
      or (report.revoked_at is null and job.queued_at <= now() - interval '1 day')
    order by job.queued_at
    limit 100
  `;
  const storage = neonStorage();
  const now = Date.now();
  const cutoff = now - graceMs;
  let failed = false;
  for (const job of jobs.filter((candidate) => cleanupReady(candidate, now))) {
    try {
      const keep = new Set((await db<{ key: string }[]>`
        select body->>'key' as key from public.whispers_records where report_id=${job.report_id} and kind='photo'
      `).map((row) => row.key));
      const keys: { Key: string }[] = [];
      let retry = false;
      let cursor: string | undefined;
      do {
        const page = await storage.send(new ListObjectsV2Command({
          Bucket: NEON_PHOTO_BUCKET,
          Prefix: job.report_id + "/",
          ...(cursor ? { ContinuationToken: cursor } : {}),
        }));
        for (const file of page.Contents ?? []) {
          if (!file.Key || keep.has(file.Key)) continue;
          if (!job.revoked_at && (!file.LastModified || file.LastModified.getTime() > cutoff)) {
            retry = true;
          } else {
            keys.push({ Key: file.Key });
          }
        }
        cursor = page.IsTruncated ? page.NextContinuationToken : undefined;
      } while (cursor);
      for (let offset = 0; offset < keys.length; offset += 100) {
        const deleted = await storage.send(new DeleteObjectsCommand({
          Bucket: NEON_PHOTO_BUCKET, Delete: { Objects: keys.slice(offset, offset + 100) },
        }));
        if (deleted.Errors?.length) throw new Error("Some private media objects could not be deleted.");
      }
      if (retry) {
        await db`update public.whispers_media_cleanup set queued_at=clock_timestamp()
          where report_id=${job.report_id} and queued_at=${job.queued_at}::timestamptz`;
      } else {
        await db`delete from public.whispers_media_cleanup
          where report_id=${job.report_id} and queued_at=${job.queued_at}::timestamptz`;
      }
    } catch {
      failed = true;
      await db`update public.whispers_media_cleanup set queued_at=clock_timestamp()
        where report_id=${job.report_id} and queued_at=${job.queued_at}::timestamptz`;
    }
  }
  await db`select public.whispers_purge_pilot_limits()`;
  await db`delete from public.voice_request_limits where started_at < now() - interval '1 day'`;
  if (failed) throw new Error("Some private media cleanup jobs need retrying.");
  return { ok: true, expired: result?.expired ?? 0 };
}
