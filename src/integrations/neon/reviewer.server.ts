import { GetObjectCommand, S3Client } from "@aws-sdk/client-s3";
import { createRemoteJWKSet, jwtVerify } from "jose";
import postgres from "postgres";

let database: ReturnType<typeof postgres> | undefined;
let keys: ReturnType<typeof createRemoteJWKSet> | undefined;
let storage: S3Client | undefined;

export async function neonReviewer(request: Request, photoId?: string) {
  const headers = { "Cache-Control": "no-store" };
  const reply = (status: number) => Response.json({ ok: false }, { status, headers });
  const token = /^Bearer (\S+)$/.exec(request.headers.get("authorization") ?? "")?.[1];
  if (!token) return reply(401);
  const authUrl = process.env["NEON_AUTH_BASE_URL"];
  const jwksUrl = process.env["NEON_AUTH_JWKS_URL"];
  const databaseUrl = process.env["DATABASE_URL"];
  if (!authUrl || !jwksUrl || !databaseUrl) return reply(503);

  const issuer = new URL(authUrl).origin;
  let actorSubject: string;
  try {
    keys ??= createRemoteJWKSet(new URL(jwksUrl));
    const { payload } = await jwtVerify(token, keys, {
      issuer,
      audience: issuer,
      requiredClaims: ["sub", "exp"],
    });
    if (!payload.sub) return reply(401);
    actorSubject = payload.sub;
  } catch {
    return reply(401);
  }

  try {
    database ??= postgres(databaseUrl, { max: 3, connect_timeout: 5, prepare: false });
    const result = await database.begin(async (sql) => {
      const [actor] = await sql<{ id: string }[]>`select id from auth.users where issuer = ${issuer} and subject = ${actorSubject}`;
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
    const endpoint = process.env["AWS_ENDPOINT_URL_S3"];
    const region = process.env["AWS_REGION"];
    if (!endpoint || !region || !process.env["AWS_ACCESS_KEY_ID"] || !process.env["AWS_SECRET_ACCESS_KEY"]) {
      return reply(503);
    }
    storage ??= new S3Client({ endpoint, region, forcePathStyle: true });
    const image = await storage.send(new GetObjectCommand({ Bucket: "whispers-private", Key: result.key }), {
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
