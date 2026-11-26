import { neonDatabase } from "./database.server";
import type { neonIdentity } from "./identity.server";

export type RetentionCommand =
  | { removalId: string }
  | { extensionId: string; nextReview: string; reason: string };

export async function neonRetentionAdmin(
  identity: NonNullable<Awaited<ReturnType<typeof neonIdentity>>>,
  command?: RetentionCommand,
) {
  return neonDatabase().begin(async (sql) => {
    const [admin] = await sql<{ id: string; contexts: string[] }[]>`
      select a.id, r.contexts from auth.users a
      join public.user_roles r on r.user_id=a.id
      where a.issuer=${identity.issuer} and a.subject=${identity.subject} and r.role='admin' and r.active
      for share of r
    `;
    if (!admin?.contexts.length) return null;

    if (!command) {
      const reports = await sql`
        select id, workspace, expires_at, removal_requested_at from public.whispers_reports
        where workspace=any(${admin.contexts}::text[]) and revoked_at is null and expires_at>now()
        order by removal_requested_at nulls last, expires_at, id limit 100
      `;
      return { reports };
    }

    const id = "removalId" in command ? command.removalId : command.extensionId;
    const [report] = await sql<{ workspace: string; removal_requested_at: Date | null }[]>`
      select workspace, removal_requested_at from public.whispers_reports
      where id=${id} and workspace=any(${admin.contexts}::text[])
        and revoked_at is null and expires_at>now()
      for update
    `;
    if (!report) return null;
    if ("removalId" in command) {
      const [result] = await sql<{ ok: boolean }[]>`select public.whispers_revoke_private(${id}::uuid) as ok`;
      if (!result?.ok) return null;
      await sql`insert into public.whispers_audit(actor_id, action, workspace, target_id)
        values (${admin.id}, 'remove', ${report.workspace}, ${id})`;
    } else {
      if (report.removal_requested_at) return null;
      const [result] = await sql<{ ok: boolean }[]>`
        select public.whispers_extend_retention(${id}::uuid, ${admin.id}::uuid,
          ${command.nextReview}::timestamptz, ${command.reason}) as ok
      `;
      if (!result?.ok) return null;
    }
    return { ok: true };
  });
}
