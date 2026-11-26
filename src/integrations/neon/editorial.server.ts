import type { EditorialCommand } from "@/lib/whispers/editorial";
import { neonDatabase } from "./database.server";
import type { neonIdentity } from "./identity.server";

export async function neonEditorial(
  identity: NonNullable<Awaited<ReturnType<typeof neonIdentity>>>,
  command?: EditorialCommand,
) {
  return neonDatabase().begin(async (sql) => {
    const [actor] = await sql<{ id: string }[]>`
      select id from auth.users where issuer=${identity.issuer} and subject=${identity.subject}
    `;
    if (!actor) return null;
    const roles = await sql<{ role: string; contexts: string[] }[]>`
      select role, contexts from public.user_roles where user_id=${actor.id}
        and active and role in ('reviewer','expert','publisher') and cardinality(contexts)>0
      for share
    `;
    if (!roles.length) return null;
    const scopes = (role: string) => roles.find(entry => entry.role === role)?.contexts ?? [];
    const reviewer = scopes("reviewer");
    const expert = scopes("expert");
    const publisher = scopes("publisher");

    if (!command) {
      const requests = await sql`
        select x.id, x.workspace, x.packet, x.state,
          case when x.workspace=any(${reviewer}::text[]) then x.interpretation end as interpretation,
          x.workspace=any(${reviewer}::text[]) as reviewer,
          a.expert_id is not null as assigned,
          (select jsonb_build_object('choice', e.choice, 'explanation', e.explanation)
            from public.whispers_expert_responses e where e.request_id=x.id and e.expert_id=a.expert_id) as mine,
          case when x.workspace=any(${reviewer}::text[]) then
            (select coalesce(jsonb_agg(response), '[]'::jsonb) from (
              select e.choice, e.explanation from public.whispers_expert_responses e
              where e.request_id=x.id order by e.created_at, e.id limit 100
            ) response) else '[]'::jsonb end as responses
        from public.whispers_expert_requests x
        left join public.whispers_expert_assignments a on a.request_id=x.id
          and a.expert_id=${actor.id} and x.workspace=any(${expert}::text[])
        where (x.workspace=any(${reviewer}::text[]) or a.expert_id is not null)
          and cardinality(x.report_ids)>0 and not exists (
            select 1 from unnest(x.report_ids) source(id) left join public.whispers_reports r on r.id=source.id
            where r.id is null or r.workspace<>x.workspace or r.revoked_at is not null
              or r.expires_at<=now() or r.removal_requested_at is not null
          )
        order by x.created_at desc, x.id limit 100
      `;
      const updates = await sql`
        select id, workspace, body, state, author_id=${actor.id} as mine,
          disclosure_reviewer_id is not null as disclosed
        from public.whispers_updates
        where workspace=any(${reviewer}::text[]) or workspace=any(${publisher}::text[])
        order by created_at desc, id limit 100
      `;
      return { requests, updates, reviewer, expert, publisher };
    }

    if (command.action === "request_experts" || command.action === "draft_update") {
      const [report] = await sql<{ workspace: string }[]>`
        select workspace from public.whispers_reports where id=${command.id} and workspace=any(${reviewer}::text[])
          and revoked_at is null and expires_at>now() and removal_requested_at is null for update
      `;
      if (!report) return null;
      if (command.action === "request_experts") {
        const [available] = await sql<{ ok: boolean }[]>`
          select exists(select 1 from public.user_roles where role='expert' and active
            and ${report.workspace}=any(contexts)) as ok
        `;
        if (!available?.ok) return null;
        await sql`select public.whispers_create_expert_request(
          ${command.id}::uuid, ${actor.id}::uuid, ${sql.json(command.packet)}::jsonb)`;
      } else {
        const [update] = await sql<{ id: string }[]>`
          insert into public.whispers_updates(workspace,source_report_ids,body,author_id)
          values (${report.workspace},array[${command.id}::uuid],${sql.json(command.update)},${actor.id}) returning id
        `;
        await sql`insert into public.whispers_audit(actor_id,action,workspace,target_id)
          values (${actor.id}, 'draft_update', ${report.workspace}, ${update?.id ?? null})`;
      }
    } else if (command.action === "expert_response" || command.action === "interpret") {
      const [request] = await sql<{ report_ids: string[]; workspace: string }[]>`
        select report_ids, workspace from public.whispers_expert_requests where id=${command.id}
      `;
      if (!request?.report_ids.length) return null;
      const sources = await sql`
        select id from public.whispers_reports where id=any(${request.report_ids}::uuid[])
          and workspace=${request.workspace} and revoked_at is null and expires_at>now()
          and removal_requested_at is null order by id for share
      `;
      if (sources.length !== request.report_ids.length) return null;
      const [result] = await sql<{ ok: boolean }[]>`
        select public.whispers_resolve_expert_request(${command.id}::uuid, ${actor.id}::uuid,
          ${command.action}, ${command.text}, ${command.action === "expert_response" ? command.choice : null}) as ok
      `;
      if (!result?.ok) return null;
    } else {
      const [update] = await sql<{ allowed: boolean; source_report_ids: string[] }[]>`
        select workspace=any(${command.action === "submit_update" ? reviewer : publisher}::text[]) as allowed, source_report_ids
        from public.whispers_updates where id=${command.id}
      `;
      if (!update?.allowed) return null;
      if (command.action === "approve" || command.action === "publish") {
        // Retention locks the source before modifying its updates. Use the same order here.
        await sql`select id from public.whispers_reports
          where id=any(${update.source_report_ids}::uuid[]) order by id for update`;
      }
      const [result] = await sql<{ ok: boolean }[]>`
        select public.whispers_publication_transition(${command.id}::uuid, ${actor.id}::uuid, ${command.action}) as ok
      `;
      if (!result?.ok) return null;
    }
    return { ok: true };
  });
}
