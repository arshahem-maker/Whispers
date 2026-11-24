import { GetObjectCommand } from "@aws-sdk/client-s3";
import { neonDatabase } from "./database.server";
import { neonIdentity } from "./identity.server";
import { NEON_PHOTO_BUCKET, neonStorage } from "./storage.server";

export async function neonReviewer(request: Request, photoId?: string) {
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
      if (photoId) {
        const [photo] = await sql<{ key: string | null }[]>`select public.whispers_private_photo_key(${photoId}::uuid) as key`;
        return typeof photo?.key === "string" ? { key: photo.key } : null;
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
    if (!result) return reply(photoId ? 404 : 403);
    if ("reports" in result) return Response.json(result, { headers });

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
