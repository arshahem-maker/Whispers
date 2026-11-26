# Whispers partner-evaluation readiness

**Assessment date:** 26 November 2026  
**Scope:** GitHub `staging/neon`, Neon staging, and the Cloudflare `workers.dev` preview.  
**Decision:** Suitable for a clearly labelled product demonstration and partner conversations. Not ready to operate as a public or partner reporting channel.

## Verified operating boundary

- The public experience defaults to fictional, browser-local demonstration data.
- The connected staging preview accepts real-information submissions only from one authorized, allowlisted account. This is a constrained demonstration of the flow, not organizational access.
- Staging reports are private, unmonitored, and have no promised response. Photos, public sharing, and follow-up messages are disabled in that mode.
- The preview URL is public to anyone who knows it. `noindex` affects indexing behavior; it is not an access-control mechanism.
- Full real intake is still gated and production is not enabled. The database currently has no active reports.
- CI passed on the previous committed revision. No hosted citizen submission-to-removal flow has been proven end to end.

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
| Technical security | Server-side identity and authorization, private object checks, request limits, baseline headers, and CI checks are present | Review the full threat model, tune CSP without inline script allowances, independently assess access boundaries, and establish alerting. |
| Recovery | Database and private-object restore have not been rehearsed for this live staging deployment | Perform and document a synthetic restore of both database and private objects; verify access revocation and cleanup. |
| Legacy services | Lovable/Supabase project remains enabled and is not current source of truth | Reconcile residual metadata/configuration and dependencies before retirement. |
| Credentials | OAuth client secret appeared in conversation history | Owner rotates the secret in Google Cloud and updates Neon Auth; then verify staging login and remove any old credential. |

## Implementation changes in this branch

- Clarifies the boundary between browser-local fictional demo and restricted connected staging.
- Removes the unverified “private company” description and the account-free product promise.
- Removes the fictional-demo banner from the connected Neon reviewer workspace and hides fictional role controls in the connected build.
- Changes the partner-demo submit action and report-safety text to state that records go to unmonitored private staging.
- Adds a partner-evaluation page with a direct email link, no form, and an explicit request not to email sensitive case details.
- Tightens the browser Content Security Policy. Inline scripts/styles remain allowed because the current server-rendered app has no per-response nonce integration; this is a known residual improvement.
- Corrects the roadmap and adds this readiness register. Verification results must be refreshed after this revision is checked.

## Humanitarian data-responsibility review

OCHA describes data responsibility as safe, ethical, and effective handling of personal and non-personal data. Its current guidance and the ICRC handbook are useful frameworks for mapping data flows, sensitivity, potential harms, sharing, incidents, and accountability. These are design and operational reviews, not a substitute for determining which law applies to the service.

The EU GDPR, where applicable, requires principles such as purpose limitation, minimization, and storage limitation; Article 13 sets out information to provide when personal data are collected from a person. The app currently cannot publish a complete, accurate notice because the legal operator, relevant legal basis, full processor/transfer inventory, and complete retention periods have not been confirmed. The app therefore identifies itself as a prototype and does not present its current FAQ as a complete legal notice.

## References

- [OCHA Centre for Humanitarian Data — Data Responsibility](https://centre.humdata.org/data-policy/)
- [OCHA Data Responsibility Guidelines 2025](https://data.humdata.org/dataset/2048a947-5714-4220-905b-e662cbcd14c8/resource/8bc5b848-8ece-4f1f-a78b-18dd972bb21a/download/data-responsibility-guidelines-2025.pdf)
- [ICRC — Handbook on Data Protection in Humanitarian Action](https://www.icrc.org/en/data-protection-humanitarian-action)
- [GDPR — official EUR-Lex text](https://eur-lex.europa.eu/eli/reg/2016/679/oj/eng/)
- [Cloudflare — Worker Preview URLs and Access controls](https://developers.cloudflare.com/workers/previews/custom-domains/)
