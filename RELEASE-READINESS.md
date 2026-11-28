# Whispers partner-evaluation readiness

**Assessment date:** 26 November 2026  
**Scope:** GitHub `staging/neon`, the connected Neon staging preview, the isolated owner-run Cloudflare demo preview, and the separately deployed Cloudflare production Worker.
**Decision:** Not ready for open public or organization-backed reporting. The staging service is connected to live Neon services and accepts real-information submissions only from one authorized account in a private, unmonitored mode. That narrow path is not a public response service.

> **Current deployment update — 28 November 2026:** The production Worker now runs the GitHub `main` app at commit `12f2ea229f0acafc354a9a173b9bd19d9be1d928` (Cloudflare version `07644e45-995f-4e9c-a436-8cc6524102ff`). The production Neon branch has migrations 0012 and 0013 applied; its report and record data was not changed. Production intake remains off. The sections below are a historical assessment and are superseded where they describe the older production Worker or say production was not deployed. The duplicate Cloudflare retention route/cron is being removed because the Neon scheduled function already runs successfully hourly.

**Revision and deployment:** On 26 November 2026, PR #20 merged the runtime cleanup as `791c6265b4e71d70491ba2474af29bc9552d7a63`; `main` and `staging/neon` are synced at that commit. GitHub Verify passed on PR #20 in [run 45871203107](https://github.com/arshahem-maker/Whispers/actions/runs/45871203107), `main` in [run 45871428000](https://github.com/arshahem-maker/Whispers/actions/runs/45871428000), and `staging/neon` in [run 45871468556](https://github.com/arshahem-maker/Whispers/actions/runs/45871468556). The staging Worker Preview was refreshed from that source as Cloudflare version <https://89a8a8ee-whispers-neon-pilot.whispers-by-arsh.workers.dev>; the stable URL is <https://staging-neon-whispers-neon-pilot.whispers-by-arsh.workers.dev>. The isolated owner-demo preview was last confirmed from `2d2976c0197f9a4734187d496d409acd337cf958`. Both known preview URLs are public to anyone who has them and are not production. The separate production Worker was not changed.

**Source integration:** PR #2 originally merged the Neon integration into `main`; later changes isolated the owner demo and hardened connected staging. PR #20 removed the legacy Supabase/Lovable runtime paths and direct package dependencies from the maintained application. The historical Lovable project, database, and migration/import artifacts remain pending reconciliation. The app's Neon Auth dependency itself includes `@supabase/auth-js` transitively. The staging deployment is a Preview only and did not change the separate production Worker.

**Lovable source state:** Read-only inspection on 26 November found the Lovable project unpublished with no pending drafts. Its latest internal change modified only `.lovable/plan.md`; its current file tree lacks many Neon integration, migration, and backend files tracked in this GitHub repository. This release-readiness assessment applies to the GitHub source. Do not treat the Lovable editor or preview as a copy of the current GitHub app until their connection and source revision are reconciled.

## Verified operating boundary

- The connected staging build now defaults to its live Neon-backed path; the browser-only fictional flow remains isolated in the owner-demo build.
- The staging partner-demo flag is enabled only for one authorized, allowlisted account. It accepts real information into private staging, blocks photos and public sharing, and offers no monitoring or response. The full real-intake release gate remains off.
- The owner-run in-memory demo resets on refresh. A synthetic staging submission-to-removal flow passed; no real case data or photos were used. Staging is still not anonymous public intake, and private-media behavior is not enabled or verified.
- The preview URL is public to anyone who knows it. `noindex` affects indexing behavior; it is not an access-control mechanism.
- Route and response-header checks were repeated after PR #20. They do not verify an authenticated citizen submission, reviewer workflow, or report contents. Existing staging report records were not read or changed during the refresh.
- Cloudflare also serves an older production deployment at `https://whispers-neon-pilot.whispers-by-arsh.workers.dev`. The Worker URL is enabled for anyone, and its public home and report pages identify the experience as a fictional demo. The checked production HTML responses lacked `Content-Security-Policy`, `X-Robots-Tag`, and `Cache-Control`; `/partners` returned 404. The unauthenticated reviewer API returned 401 with `Cache-Control: no-store`. The production Worker is not the current staging revision and has no reviewed production release configuration in this repository.
- Full release intake remains gated. The public production Worker is an older fictional-demo deployment, not an operational intake service. Production report data was not inspected as part of this staging refresh.
- The isolated owner-run preview has passed an end-to-end fictional report-to-review workflow in one browser tab. This is an in-memory demo only. Connected staging passed a synthetic submission-to-removal flow, but it has no response operation; private-media behavior remains disabled and untested.
- No independent reviewers are needed to demonstrate simulated workflows, and none are represented as having completed reviews. The account owner is the temporary presenter/operator; seeded staff and review roles are fictional. Real-world operational release still requires independent reviews and an accountable organization.

## Readiness register

| Area | Current state | Needed before operational use |
| --- | --- | --- |
| Purpose and audience | Early prototype; no organization tenancy or external submitter access | Select the initial user groups and intended operational outcome. |
| Monitoring and response | No monitoring or response operation | Name a responsible operator, assign coverage, define response limits and safe escalation, and publish those commitments. |
| Identity and access | Verified Google identity and a fixed one-account staging allowlist | Decide between named accounts, anonymous access, or organization-managed access; implement tenant boundaries and least-privilege roles. |
| Notice and accountability | Contact and prototype purpose are published; legal operator/form and complete notice are unconfirmed | Confirm the controller/operator, contact for rights requests, purposes, legal basis where applicable, recipients/processors, transfers, retention, rights, and complaint route. |
| Data sharing | Partner-demo public sharing and photos are disabled | Define approved sharing recipients, agreement, redaction, consent/other applicable basis, and authorization checks before enabling any sharing. |
| Retention and removal | Staging cleanup is scheduled; private codes can request removal | Confirm report, audit, backup, provider-log, and object retention periods; test deletion and recovery with synthetic fixtures. |
| Incident handling | Technical controls exist; no operational incident process is evidenced | Name an incident owner, define triage and containment, notification decisions, and an auditable incident record. |
| Language and accessibility | English-only Neon path; translation and voice unavailable | Obtain native-language review and field-test accessibility, low-bandwidth, device, and safety assumptions. |
| Technical security | Server-side identity and authorization, private object checks, request limits, baseline headers, CSP nonces for scripts in Worker HTML, and CI checks are present | Review the full threat model and production origins, remove or tightly constrain remaining inline style allowances, independently assess access boundaries, and establish alerting. |
| Recovery | Database and private-object restore have not been rehearsed for this staging deployment | Perform and document a synthetic restore of both database and private objects; verify access revocation and cleanup. |
| Legacy services | Supabase/Lovable runtime code and direct dependencies have been removed from the GitHub app; the unpublished Lovable project and managed database remain enabled | Reconcile residual metadata, settings, accounts, and historical audit records before retirement. Do not infer the database is empty or disable it yet. |

## Launch decision and required gates

The production Worker is publicly reachable at `https://whispers-neon-pilot.whispers-by-arsh.workers.dev` and now serves the current GitHub app. The production Neon branch and migrations are configured, and production routes and baseline response headers were checked after deployment. There is no custom domain, monitoring team, or response commitment. A public `workers.dev` URL with `noindex` is still publicly reachable; this deployment is not an operational reporting launch.

The application's release-review screen is an administrative checklist backed by review references. A reference string and a recorded account do not independently prove reviewer identity, independence, competence, scope, or review quality. A responsible operator must verify the evidence outside the software before enabling an operational service. OCHA's current data-responsibility guidance and the ICRC handbook emphasize understanding data flows, sensitivity, potential harm, sharing safeguards, accountability, and operating context; the app cannot complete that assessment on the operator's behalf.

Before open public or organization-backed use, a responsible operator must complete and document all of the following:

1. Confirm the legal operator, accountable owner, privacy contact, intended users and purposes, and the jurisdictions where the service will operate.
2. Complete a contextual data-protection and safeguarding assessment. Identify likely harms from collection or disclosure, assess necessity and proportionality, and consider whether less identifying data would suffice.
3. Set the monitoring and response operation: named coverage, hours, response limits, escalation, safety handling, incident ownership, and accurate public commitments. If reports cannot be monitored, do not collect real reports.
4. Approve a complete notice before collection. Where GDPR applies, Article 13 requires specified information at collection, including controller identity/contact, purposes, legal basis, recipients, and retention information. Determine applicability with qualified advice; this register is not legal advice.
5. Confirm the processor/subprocessor, hosting location, transfer, application-log, authentication-log, backup, and object-storage retention inventory. Test deletion across app data and document provider and backup schedules separately.
6. Confirm production authentication origins and redirect URLs with the intended account and hosting domains.
7. Keep production intake off until the operational and review gates are evidenced; production schema migrations are now applied.
8. Establish a restrictive production access policy, monitoring/alerting, incident response, service-limit controls, dependency-update ownership, and a cost ceiling that does not create an unapproved charge.
9. Rehearse database and private-object restore, report removal and retention, and incident containment using synthetic records. Record the result and recovery time.
10. Obtain independent security, legal/privacy, safeguarding, operational, and language review from qualified people. Verify their scope and evidence; do not treat a UI checklist as the review itself.
11. Field-test accessibility, language comprehension, low-bandwidth and device behavior, and safety assumptions with intended user communities through an appropriate safeguarding process.
12. Review the exact production commit, document rollback, and identify who is authorized to switch intake on.

For demonstrations, use the owner-run fictional preview for synthetic workflows. The connected staging account can accept real information, but that path is private, limited to one authorized account, unmonitored, and has no response commitment; do not invite other people to submit reports. The project owner is the temporary presenter/operator; do not claim that simulated roles are independent reviewers or that real-world operational safeguards are complete.

## Implementation changes in this branch

- Removes Supabase-backed auth, reviewer, retention, voice-AI, translation, and error-reporting code from the maintained app runtime. Database/import artifacts are retained for pending legacy-data reconciliation. No remote records or services were changed.

- Clarifies the boundary between browser-local fictional demo and restricted connected staging.
- Removes the unverified “private company” description and the account-free product promise.
- Removes the fictional-demo banner from the connected Neon reviewer workspace and hides fictional role controls in the connected build.
- Earlier disables the staging real-information partner-demo flag and changes connected workspace copy to fictional-only owner-run testing; the current staging-only configuration and connected UI have since been refreshed to the restricted one-account mode described above.
- Adds a separate Cloudflare owner-demo preview build that ignores preview base configuration and carries no Neon bindings or secrets; its reports remain in browser memory.
- Disables the connected-cloud intake toggle in the owner-demo build. The form remains fictional-only and clearly says the temporary operator can demonstrate its simulated review workflow.
- Isolates the owner-demo route experience: the pilot path is an explanatory page, reviewer sign-in offers simulated fictional roles only, and the home/help/report metadata no longer implies a connected database or staging intake.
- Identifies the account owner as the temporary demo operator while clearly marking sample reports, staff roles, and review outcomes as fictional.
- Adds a partner-evaluation page with a direct email link, no form, and an explicit request not to email sensitive case details.
- Adds a fresh nonce to every script and style element in Cloudflare Worker HTML responses; the `script-src` policy no longer permits inline scripts there. Inline style attributes remain allowed for the current styling framework and need a separate production review.
- The separate production Worker was inspected read-only on 26 November 2026. It still serves an older fictional demo build, has no `/partners` page, and lacks the checked HTML response headers noted above. Keep it separate from real intake until an approved production build and configuration are reviewed and deployed.
- Corrects the roadmap and adds this readiness register. GitHub Verify passed on merged source revision `988e1cd`; the nonce/header pair was verified on `/`, `/partners`, `/help`, `/report`, and `/pilot` at the earlier connected-staging revision `c26ca44`.

## Humanitarian data-responsibility review

OCHA describes data responsibility as safe, ethical, and effective handling of personal and non-personal data. Its current guidance and the ICRC handbook are useful frameworks for mapping data flows, sensitivity, potential harms, sharing, incidents, and accountability. These are design and operational reviews, not a substitute for determining which law applies to the service.

The EU GDPR, where applicable, requires principles such as purpose limitation, minimization, and storage limitation; Article 13 sets out information to provide when personal data are collected from a person. The app currently cannot publish a complete, accurate notice because the legal operator, relevant legal basis, full processor/transfer inventory, and complete retention periods have not been confirmed. The app therefore identifies itself as a prototype and does not present its current FAQ as a complete legal notice.

## References

- [OCHA Centre for Humanitarian Data — Data Responsibility](https://centre.humdata.org/data-policy/)
- [OCHA Data Responsibility Guidelines 2025](https://centre.humdata.org/data-responsibility-guidelines-2025/)
- [ICRC — Handbook on Data Protection in Humanitarian Action](https://www.icrc.org/en/publication/430501-handbook-data-protection-humanitarian-action-second-edition)
- [GDPR — official EUR-Lex text](https://eur-lex.europa.eu/eli/reg/2016/679/oj/eng/)
- [Google OAuth best practices](https://developers.google.com/identity/protocols/oauth2/resources/best-practices)
- [Cloudflare — Worker Preview URLs and Access controls](https://developers.cloudflare.com/workers/previews/custom-domains/)
- [Cloudflare — security headers and CSP nonce example](https://developers.cloudflare.com/workers/examples/security-headers/)
- [Neon — branching and point-in-time restore](https://neon.com/storage)
