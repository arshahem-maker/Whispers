import type { NeonInvitationCommand } from "@/lib/whispers/staff-invitations";
import { neonDatabase } from "./database.server";
import type { neonIdentity } from "./identity.server";

type Identity = NonNullable<Awaited<ReturnType<typeof neonIdentity>>>;

export async function acceptNeonInvitations({ issuer, subject }: Identity) {
  return neonDatabase().begin(async (sql) => {
    const [account] = await sql<{ email: string }[]>`
      select lower(email) as email from neon_auth."user"
      where id::text=${subject} and "emailVerified" is true and email is not null
    `;
    if (!account?.email) return 0;

    const [actor] = await sql<{ id: string }[]>`
      insert into auth.users (issuer, subject, email, email_confirmed_at)
      select ${issuer}, ${subject}, ${account.email}, now()
      where exists (
        select 1 from public.whispers_staff_invitations i
        where i.email=${account.email} and i.accepted_at is null and i.revoked_at is null
          and i.expires_at>now() and exists (
            select 1 from public.user_roles r where r.user_id=i.invited_by
              and r.role='admin' and r.active and i.workspace=any(r.contexts)
          )
      )
      on conflict (issuer, subject) do update
        set email=excluded.email, email_confirmed_at=excluded.email_confirmed_at
      returning id
    `;
    if (!actor) return 0;
    await sql`select set_config('whispers.actor_id', ${actor.id}, true)`;
    const [result] = await sql<{ accepted: number }[]>`
      select public.whispers_accept_staff_invitations() as accepted
    `;
    return result?.accepted ?? 0;
  });
}

export async function manageNeonInvitations({ issuer, subject }: Identity, command?: NeonInvitationCommand) {
  return neonDatabase().begin(async (sql) => {
    const [admin] = await sql<{ id: string; contexts: string[] }[]>`
      select a.id, r.contexts from auth.users a
      join public.user_roles r on r.user_id=a.id
      where a.issuer=${issuer} and a.subject=${subject} and r.role='admin' and r.active
      for share of r
    `;
    if (!admin?.contexts.length) return null;
    const releaseAdmin = ["ua", "td", "general"].every(scope => admin.contexts.includes(scope));
    if (!command) {
      const invitations = await sql`
        select id, email, role, workspace, expires_at, accepted_at, revoked_at
        from public.whispers_staff_invitations where workspace=any(${admin.contexts}::text[])
        order by created_at desc, id desc limit 100
      `;
      const staff = await sql`
        select distinct a.id, coalesce(a.email,'') as email from public.user_roles r
        join auth.users a on a.id=r.user_id
        where r.active and r.contexts && ${admin.contexts}::text[]
          and a.issuer=${issuer} and a.email_confirmed_at is not null
        order by email, a.id limit 100
      `;
      const releaseReviews = releaseAdmin ? await sql`
        select distinct kind from public.whispers_release_reviews order by kind
      ` : null;
      return { scopes: admin.contexts, invitations, staff, releaseReviews };
    }

    if (command.action === "release_review") {
      if (!releaseAdmin) return null;
      const [review] = await sql<{ id: string }[]>`
        insert into public.whispers_release_reviews (kind,reference,reviewer_id)
        values (${command.kind},${command.reference},${admin.id}) returning id
      `;
      if (!review) throw new Error("Review was not recorded.");
      await sql`insert into public.whispers_audit(actor_id,action,workspace,target_id)
        values (${admin.id},'release_review','general',${review.id})`;
    } else if (command.action === "staff_role") {
      if (!admin.contexts.includes(command.workspace) || (admin.id === command.userId && command.role === "admin")) {
        return null;
      }
      const [target] = await sql<{ id: string }[]>`
        select a.id from auth.users a join neon_auth."user" u on u.id::text=a.subject
        where a.id=${command.userId} and a.issuer=${issuer} and u."emailVerified" is true
          and exists (select 1 from public.user_roles r where r.user_id=a.id and r.active
            and r.contexts && ${admin.contexts}::text[])
      `;
      if (!target) return null;
      await sql`select public.whispers_set_staff_scope(${admin.id}::uuid, ${target.id}::uuid,
        ${command.role}, array[${command.workspace}::text], ${command.active})`;
    } else if (command.action === "invite_staff") {
      const { email, role, workspace } = command.invitation;
      if (!admin.contexts.includes(workspace)) return null;
      await sql`select pg_advisory_xact_lock(hashtextextended(${JSON.stringify([email, role, workspace])}, 0))`;
      const [created] = await sql<{ id: string }[]>`
        insert into public.whispers_staff_invitations (email, role, workspace, invited_by)
        select ${email}, ${role}, ${workspace}, ${admin.id}
        where not exists (
          select 1 from public.whispers_staff_invitations i
          where i.email=${email} and i.role=${role} and i.workspace=${workspace}
            and i.revoked_at is null and i.accepted_at is null and i.expires_at>now()
            and exists (
              select 1 from public.user_roles r where r.user_id=i.invited_by
                and r.role='admin' and r.active and i.workspace=any(r.contexts)
            )
        )
        returning id
      `;
      if (created) {
        await sql`insert into public.whispers_audit(actor_id, action, workspace, target_id)
          values (${admin.id}, 'invite_staff', ${workspace}, ${created.id})`;
      }
    } else {
      const [revoked] = await sql<{ workspace: string }[]>`
        update public.whispers_staff_invitations set revoked_at=now()
        where id=${command.id} and workspace=any(${admin.contexts}::text[])
          and accepted_at is null and revoked_at is null returning workspace
      `;
      if (!revoked) return null;
      await sql`insert into public.whispers_audit(actor_id, action, workspace, target_id)
        values (${admin.id}, 'revoke_invitation', ${revoked.workspace}, ${command.id})`;
    }
    return { ok: true };
  });
}
