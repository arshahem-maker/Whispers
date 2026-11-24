import { GetObjectCommand } from "@aws-sdk/client-s3";
import type { EditorialCommand } from "@/lib/whispers/editorial";
import { neonEditorial } from "./editorial.server";
import { neonDatabase } from "./database.server";
import { neonRetentionAdmin, type RetentionCommand } from "./retention-admin.server";
import { neonIdentity } from "./identity.server";
import type { NeonInvitationCommand } from "@/lib/whispers/staff-invitations";
import { acceptNeonInvitations, manageNeonInvitations } from "./staff-invitations.server";
import { NEON_PHOTO_BUCKET, neonStorage } from "./storage.server";

type ReviewSelection = { reportId: string } & (
  | { reply: string }
  | { note: string }
  | { state: "in_review" | "awaiting_contributor" | "awaiting_expert" | "complete" }
  | { reply?: never; note?: never; state?: never }
);

export async function neonReviewer(
  request: Request,
  selection?: { photoId: string } | ReviewSelection | { acceptInvitations: true } | { invitations: true } | NeonInvitationCommand | { retention: true } | RetentionCommand | { editorial: true | EditorialCommand },
) {
  const headers = { "Cache-Control": "no-store" };
  const reply = (status: number) => Response.json({ ok: false }, { status, headers });
  try {
    const identity = await neonIdentity(request);
    if (!identity) return reply(401);
    if (selection && "acceptInvitations" in selection) {
      return Response.json({ accepted: await acceptNeonInvitations(identity) }, { headers });
    }
    if (selection && ("invitations" in selection || "action" in selection)) {
      const result = await manageNeonInvitations(identity, "action" in selection ? selection : undefined);
      return result ? Response.json(result, { headers }) : reply(403);
    }
    if (selection && ("retention" in selection || "removalId" in selection || "extensionId" in selection)) {
      const result = await neonRetentionAdmin(identity, "retention" in selection ? undefined : selection);
      return result ? Response.json(result, { headers }) : reply(403);
    }
    if (selection && "editorial" in selection) {
      const result = await neonEditorial(identity, selection.editorial === true ? undefined : selection.editorial);
      return result ? Response.json(result, { headers }) : reply(403);
    }
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
          id: string; workspace: string; text: string | null; state: string | null; removal_requested_at: Date | null;
        }[]>`
          select r.id, r.workspace, r.body->>'text' as text, r.body->>'processingState' as state, r.removal_requested_at
          from public.whispers_reports r
          where r.id=${selection.reportId} and r.revoked_at is null and r.expires_at > now()
            and public.whispers_access(r.workspace, 'reviewer')
          for update
        `;
        if (!report) return null;
        const action = "reply" in selection ? "reply" : "note" in selection ? "note"
          : "state" in selection ? "assess" : "read_report";
        if (action !== "read_report" && report.removal_requested_at) return { removalPending: true };
        if ("reply" in selection || "note" in selection) {
          const text = "reply" in selection ? selection.reply : selection.note;
          const kind = "reply" in selection ? "message" : "note";
          await sql`insert into public.whispers_records (report_id, workspace, kind, body)
            values (${report.id}, ${report.workspace}, ${kind}, ${sql.json({ text: text ?? "", sender: "reviewer" })})`;
        } else if ("state" in selection && selection.state) {
          await sql`update public.whispers_reports set version=version+1,
            body=jsonb_set(body, '{processingState}', to_jsonb(${selection.state}::text))
            where id=${report.id}`;
          report.state = selection.state;
        }
        await sql`insert into public.whispers_audit (actor_id, action, workspace, target_id)
          values (${actor.id}, ${action}, ${report.workspace}, ${report.id})`;
        const messages = await sql`
          select id, kind, body->>'text' as text, body->>'sender' as sender, created_at
          from public.whispers_records where report_id=${report.id} and kind in ('message','note')
          order by created_at desc, id desc limit 100
        `;
        return { report, messages: messages.reverse() };
      }
      const [access] = await sql<{ allowed: boolean }[]>`
        select exists(select 1 from public.user_roles
          where user_id=${actor.id} and active and role='reviewer' and cardinality(contexts)>0) as allowed
      `;
      if (!access?.allowed) return null;
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
  } catch (error) {
    if (selection && "editorial" in selection && typeof error === "object" && error
      && "code" in error && error.code === "P0001") {
      return reply(409);
    }
    return reply(503);
  }
}
