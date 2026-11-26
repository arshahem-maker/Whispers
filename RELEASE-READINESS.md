# Whispers partner-evaluation readiness

**Assessment date:** 26 November 2026  
**Scope:** GitHub `staging/neon`, Neon staging, the connected fictional-only Cloudflare preview, the isolated owner-run Cloudflare demo preview, and the separately deployed Cloudflare production Worker.
**Decision:** Not ready for live reporting. Suitable for an owner-run product demonstration using fictional data and for non-sensitive partner-evaluation conversations.

**Revision and deployment:** Staging app revision `c26ca44c7c94f0b74aa272b81453a0dfc60b5825` remains deployed to the connected staging preview. The isolated owner-demo preview is built from `2d2976c0197f9a4734187d496d409acd337cf958`. The latest source was merged by PR #8 as `988e1cd542fab7bfe9601da43e171e84246f9fa8`; GitHub Verify passed on that merge commit in [run 45802150296](https://github.com/arshahem-maker/Whispers/actions/runs/45802150296). Both previews are public to anyone with their URLs and are not production.

**Source integration:** PR #2 was merged into `main` on 26 November 2026 as merge commit `43d890b`. Verify passed on the final pre-merge branch revision, including documentation updates, in [run 45795861111](https://github.com/arshahem-maker/Whispers/actions/runs/45795861111). This source merge did not deploy or change the production Worker.

## Verified operating boundary

- The public experience defaults to fictional, browser-local demonstration data.
- The connected staging preview accepts fictional test reports only from one authorized, allowlisted account. The account owner is the temporary operator and can review synthetic records during a demonstration. This is not organizational access.
- Real-information partner-demo intake was disabled on 26 November 2026. The owner-run in-memory demo resets on refresh; connected synthetic reports stay in private staging and can be removed using the reviewer controls. Neither demo is continuously monitored or promises a response.
- The preview URL is public to anyone who knows it. `noindex` affects indexing behavior; it is not an access-control mechanism.
- Cloudflare also serves an older production deployment at `https://whispers-neon-pilot.whispers-by-arsh.workers.dev`. The Worker URL is enabled for anyone, and its public home and report pages identify the experience as a fictional demo. The checked production HTML responses lacked `Content-Security-Policy`, `X-Robots-Tag`, and `Cache-Control`; `/partners` returned 404. The unauthenticated reviewer API returned 401 with `Cache-Control: no-store`. The production Worker is not the current staging revision and has no reviewed production release configuration in this repository.
- Full release intake remains gated. The public production Worker is an older fictional-demo deployment, not an operational intake service; the database currently has no active reports.
- The isolated owner-run preview has passed an end-to-end fictional report-to-review workflow in one browser tab. This is an in-memory demo only. Connected staging has not yet passed a full submission-to-removal, response, or private-media flow.
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
| Legacy services | Lovable/Supabase project remains enabled and is not current source of truth | Reconcile residual metadata/configuration and dependencies before retirement. |
| Credentials | OAuth client secret appeared in conversation history | Owner rotates the secret in Google Cloud, updates Neon Auth, verifies staging login, and removes the old credential. Do not use the current credential for launch. |

## Launch decision and required gates

An older Cloudflare Worker is deployed in the production environment and publicly reachable, but this repository has no reviewed production release configuration or deployment workflow. A Neon branch named `production` exists, but the current app's production integration and OAuth configuration have not been reviewed or verified. There is no custom domain, monitoring team, or response commitment. Staging checks cannot certify those parts. A public `workers.dev` URL with `noindex` is still publicly reachable; the existing Worker is a fictional demonstration, not an operational launch.

The application's release-review screen is an administrative checklist backed by review references. A reference string and a recorded account do not independently prove reviewer identity, independence, competence, scope, or review quality. A responsible operator must verify the evidence outside the software before enabling an operational service. OCHA's current data-responsibility guidance and the ICRC handbook emphasize understanding data flows, sensitivity, potential harm, sharing safeguards, accountability, and operating context; the app cannot complete that assessment on the operator's behalf.

Before live use, a responsible operator must complete and document all of the following:

1. Confirm the legal operator, accountable owner, privacy contact, intended users and purposes, and the jurisdictions where the service will operate.
2. Complete a contextual data-protection and safeguarding assessment. Identify likely harms from collection or disclosure, assess necessity and proportionality, and consider whether less identifying data would suffice.
3. Set the monitoring and response operation: named coverage, hours, response limits, escalation, safety handling, incident ownership, and accurate public commitments. If reports cannot be monitored, do not collect real reports.
4. Approve a complete notice before collection. Where GDPR applies, Article 13 requires specified information at collection, including controller identity/contact, purposes, legal basis, recipients, and retention information. Determine applicability with qualified advice; this register is not legal advice.
5. Confirm the processor/subprocessor, hosting location, transfer, application-log, authentication-log, backup, and object-storage retention inventory. Test deletion across app data and document provider and backup schedules separately.
6. Rotate the OAuth secret that appeared in conversation history; configure separate, least-privilege production credentials; confirm exact allowed origins and redirect URLs; and verify the old credential is no longer accepted.
7. Provision separate production services, apply and review migrations, configure production authentication and domain, and keep every production intake setting off until approvals are evidenced.
8. Establish a restrictive production access policy, monitoring/alerting, incident response, service-limit controls, dependency-update ownership, and a cost ceiling that does not create an unapproved charge.
9. Rehearse database and private-object restore, report removal and retention, credential revocation, and incident containment using synthetic records. Record the result and recovery time.
10. Obtain independent security, legal/privacy, safeguarding, operational, and language review from qualified people. Verify their scope and evidence; do not treat a UI checklist as the review itself.
11. Field-test accessibility, language comprehension, low-bandwidth and device behavior, and safety assumptions with intended user communities through an appropriate safeguarding process.
12. Review the exact production commit, run the release workflow, and document rollback and who is authorized to switch intake on.

For demonstrations, use the owner-run fictional preview or the connected staging workspace with fictional test data only. The project owner is the temporary presenter/operator; do not claim that simulated roles are independent reviewers. Do not invite anyone to submit real reports or send case details by email. The remaining gates apply only before real-world operational use.

## Implementation changes in this branch

- Clarifies the boundary between browser-local fictional demo and restricted connected staging.
- Removes the unverified “private company” description and the account-free product promise.
- Removes the fictional-demo banner from the connected Neon reviewer workspace and hides fictional role controls in the connected build.
- Disables the staging real-information partner-demo flag and changes connected workspace copy to fictional-only owner-run testing.
- Adds a separate Cloudflare owner-demo preview build that ignores preview base configuration and carries no Neon bindings or secrets; its reports remain in browser memory.
- Disables the connected-cloud intake toggle in the owner-demo build. The form remains fictional-only and clearly says the temporary operator can demonstrate its simulated review workflow.
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
