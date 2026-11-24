import { GetObjectCommand } from "@aws-sdk/client-s3";
import { neonDatabase } from "./database.server";
import { neonIdentity } from "./identity.server";
import { NEON_PHOTO_BUCKET, neonStorage } from "./storage.server";

export async function neonReviewer(
  request: Request,
  selection?: { photoId: string } | { reportId: string; reply?: string },
) {
  const headers = { "Cache-Control": "no-store" };
  const reply = (status: number) => Response.json({ ok: false }, { status, headers });
  try {
    const identity = await neonIdentity(request);
    if (!identity) return reply(401);
    const database = neonDatabase();
    const result = await database.begin(async (sql) => {
      const [actor] = await sql<{ id: string }[]>`select id from auth.users where issuer = ${identity.issuer} and subject = ${identity.subject}`;
      if (!actor) return null;
      await sql`select set_config('whispers.actor_id', ${actor.id}, true)`;
      if (selection && "photoId" in selection) {
        const [photo] = await sql<{ key: string | null }[]>`select public.whispers_private_photo_key(${selection.photoId}::uuid) as key`;
        return typeof photo?.key === "string" ? { key: photo.key } : null;
      }
      if (selection && "reportId" in selection) {
        const [report] = await sql<{
          id: string; workspace: string; text: string | null; removal_requested_at: Date | null;
        }[]>`
          select r.id, r.workspace, r.body->>'text' as text, r.removal_requested_at
          from public.whispers_reports r
          where r.id=${selection.reportId} and r.revoked_at is null and r.expires_at > now()
            and public.whispers_access(r.workspace, 'reviewer')
          for update
        `;
        if (!report) return null;
        if (selection.reply !== undefined) {
          if (report.removal_requested_at) return { removalPending: true };
          await sql`insert into public.whispers_records (report_id, workspace, kind, body)
            values (${report.id}, ${report.workspace}, 'message', ${sql.json({ text: selection.reply, sender: "reviewer" })})`;
        }
        await sql`insert into public.whispers_audit (actor_id, action, workspace, target_id)
          values (${actor.id}, ${selection.reply === undefined ? "read_report" : "reply"}, ${report.workspace}, ${report.id})`;
        const messages = await sql`
          select id, body->>'text' as text, body->>'sender' as sender, created_at
          from public.whispers_records where report_id=${report.id} and kind='message'
          order by created_at desc, id desc limit 100
        `;
        return { report, messages: messages.reverse() };
      }
      const reports = await sql`
        select r.id, r.workspace, r.received_at,
          coalesce(r.body->>'category', '') as category,
          coalesce(jsonb_agg(p.id order by p.created_at) filter (where p.id is not null), '[]'::jsonb) as photos
        from public.whispers_reports r
        left join public.whispers_records p on p.report_id = r.id and p.workspace = r.workspace and p.kind='photo'
        where r.revoked_at is null and r.expires_at > now()
          and public.whispers_access(r.workspace, 'reviewer')
        group by r.id
        order by r.received_at desc
        limit 50
      `;
      return { reports };
    });
    if (!result) return reply(selection ? 404 : 403);
    if ("removalPending" in result) return reply(409);
    if ("reports" in result || "report" in result) return Response.json(result, { headers });

    if (!result.key) return reply(404);
    const image = await neonStorage().send(new GetObjectCommand({ Bucket: NEON_PHOTO_BUCKET, Key: result.key }), {
      abortSignal: request.signal,
    });
    if (!image.Body || image.ContentType !== "image/jpeg") return reply(404);
    return new Response(image.Body.transformToWebStream() as ReadableStream, {
      headers: { ...headers, "Content-Type": "image/jpeg", "X-Content-Type-Options": "nosniff" },
    });
  } catch {
    return reply(503);
  }
}
