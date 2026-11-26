# Whispers partner-evaluation readiness

**Assessment date:** 26 November 2026  
**Scope:** GitHub `staging/neon`, Neon staging, the current Cloudflare preview, and the separately deployed Cloudflare production Worker.
**Decision:** Not ready for a live launch or as a public or partner reporting channel. Suitable only for a clearly labelled product demonstration and non-sensitive partner-evaluation conversations.

**Revision and deployment:** Application revision `c26ca44c7c94f0b74aa272b81453a0dfc60b5825` is deployed to the staging preview. GitHub Verify passed on this exact revision in [runs 45788162408](https://github.com/arshahem-maker/Whispers/actions/runs/45788162408) and [45788154662](https://github.com/arshahem-maker/Whispers/actions/runs/45788154662). The preview is not production and is not access-controlled.

## Verified operating boundary

- The public experience defaults to fictional, browser-local demonstration data.
- The connected staging preview accepts real-information submissions only from one authorized, allowlisted account. This is a constrained demonstration of the flow, not organizational access.
- Staging reports are private, unmonitored, and have no promised response. Photos, public sharing, and follow-up messages are disabled in that mode.
- The preview URL is public to anyone who knows it. `noindex` affects indexing behavior; it is not an access-control mechanism.
- Cloudflare also serves an older production deployment at `https://whispers-neon-pilot.whispers-by-arsh.workers.dev`. The Worker URL is enabled for anyone, and its public home and report pages identify the experience as a fictional demo. The checked production HTML responses lacked `Content-Security-Policy`, `X-Robots-Tag`, and `Cache-Control`; `/partners` returned 404. The unauthenticated reviewer API returned 401 with `Cache-Control: no-store`. The production Worker is not the current staging revision and has no reviewed production release configuration in this repository.
- Full release intake remains gated. The public production Worker is an older fictional-demo deployment, not an operational intake service; the database currently has no active reports.
- CI passed on the latest GitHub branch revision, but hosted verification is limited to route rendering, status, and authenticated workspace reads. No hosted citizen submission-to-removal flow has been proven end to end.
- The restricted staging partner-demo switch is a separate exception to the full-release gate. It permits one allowlisted account to submit real information into staging. It does not imply that this data is safe to collect operationally; that account must use synthetic or non-sensitive demonstration content.

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

Until these gates are complete, use the browser-local fictional demonstration and partner-evaluation page only. Do not invite the public or organizations to submit real reports, and do not send case details by email.

## Implementation changes in this branch

- Clarifies the boundary between browser-local fictional demo and restricted connected staging.
- Removes the unverified “private company” description and the account-free product promise.
- Removes the fictional-demo banner from the connected Neon reviewer workspace and hides fictional role controls in the connected build.
- Changes the partner-demo submit action and report-safety text to state that records go to unmonitored private staging.
- Adds a partner-evaluation page with a direct email link, no form, and an explicit request not to email sensitive case details.
- Adds a fresh nonce to every script and style element in Cloudflare Worker HTML responses; the `script-src` policy no longer permits inline scripts there. Inline style attributes remain allowed for the current styling framework and need a separate production review.
- The separate production Worker was inspected read-only on 26 November 2026. It still serves an older fictional demo build, has no `/partners` page, and lacks the checked HTML response headers noted above. Keep it separate from real intake until an approved production build and configuration are reviewed and deployed.
- Corrects the roadmap and adds this readiness register. Latest GitHub CI passed; the nonce/header pair was verified on `/`, `/partners`, `/help`, `/report`, and `/pilot` at app revision `c26ca44`.

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
