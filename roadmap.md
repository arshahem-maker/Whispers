# Whispers release roadmap

Status checked 26 November 2026. This roadmap describes the maintained `staging/neon` branch and its restricted Cloudflare preview. The preview is a demonstration, not an operational reporting service.

## Current state

- The maintained code is on GitHub branch `staging/neon`. PR #2 targets `main`, is open and ready for review, and is not merged. The staging preview contains the application changes from `c26ca44`; documentation updates have also been pushed. The production branch and production Neon project have not been changed by the staging pilot.
- GitHub Verify passed on application revision `c26ca44` in runs [45788162408](https://github.com/arshahem-maker/Whispers/actions/runs/45788162408) and [45788154662](https://github.com/arshahem-maker/Whispers/actions/runs/45788154662).
- The Cloudflare staging preview is public to anyone who has the URL and is marked `noindex`. It must not be described as access-controlled. Its Neon partner-demo intake is limited to one verified, allowlisted account and the isolated staging database.
- The partner-demo mode accepts real-information submissions from that one account, but reports are unmonitored and there is no response commitment. Photos, public sharing, and follow-up messages are disabled. Full real intake remains gated; production intake is unchanged.
- Staging has no active reports. No submission, response, deletion, or private-photo end-to-end flow has been proven in the hosted environment.
- Cloudflare Worker HTML now uses per-response CSP nonces for script tags; `/`, `/partners`, `/help`, `/report`, and `/pilot` were checked for matching header/body nonces. Inline styles remain allowed. This is a security hardening step, not an independent security review.
- A separate older Cloudflare **production** Worker remains publicly reachable at `whispers-neon-pilot.whispers-by-arsh.workers.dev`. It presents the fictional demo; `/partners` returns 404; checked HTML responses lacked CSP, `X-Robots-Tag`, and `Cache-Control`. Its unauthenticated reviewer API returned 401/no-store. This live deployment is not the current staging revision, and there is no reviewed production release configuration or deployment workflow in the repository. Do not invite real reports through it.
- Lovable remains an unpublished legacy copy with its managed Supabase database enabled. It is not the source of truth for this Neon branch. Do not disable it until remaining configuration and historical metadata have a reviewed disposition.
- Translation preparation and voice are unavailable in the Neon app path. Realtime is provisioned but not used by the app. Do not advertise these as available.

## Work that can be completed in code

1. Keep user-facing language accurate for each mode: local fictional demo, restricted staging demonstration, and any future approved release.
2. Add partner-evaluation information that does not invite the public to submit cases or collect sensitive details.
3. Publish a complete privacy notice only after the real operator, data flows, retention, hosting, sharing, and applicable legal basis have been confirmed.
4. Add a narrow Content Security Policy and remove inline-script allowances when the framework supports safe per-response nonces.
5. Add isolated synthetic end-to-end checks for submission, reviewer scoping, removal, scheduled expiry, and restore. Never use real case information as test data.
6. Keep CI and test results tied to the exact current commit. Do not describe a build or route smoke check as proof of a complete citizen workflow.

## Work requiring a responsible human or external account

1. Confirm the legal operator and legal form, public contact for privacy requests, and who is accountable for the service.
2. Decide who monitors reports, how quickly, what action is possible, and what escalation and incident procedures apply. Until this exists, keep the app clearly marked unmonitored and do not invite real submissions.
3. Complete legal/privacy, safeguarding, native-language, security, and operational reviews with independent reviewers. Recorded references alone do not prove review quality.
4. Decide whether the product requires verified accounts, anonymous intake, or organization-managed access. Build and test the selected model before expanding the tester allowlist.
5. Rotate the Google OAuth client secret that was shared in conversation history, update the Neon Auth provider, and confirm sign-in still works. Credential entry and final submission must be completed by the account owner in Google/Neon settings.
6. Configure and test production OAuth and production services separately. Do not use staging verification as production approval.
7. Complete a recovery rehearsal for database data and private objects, and set alerts for retention failures and service limits.
8. Reconcile the legacy Lovable/Supabase project and its remaining metadata/settings before retirement.

## Humanitarian data-responsibility reference

For partner evaluation, use the current [OCHA Data Responsibility Guidelines](https://centre.humdata.org/data-policy/) and the [ICRC Handbook on Data Protection in Humanitarian Action](https://www.icrc.org/en/data-protection-humanitarian-action). They emphasize understanding data flows, potential harms, sensitivity, sharing safeguards, incident handling, and accountability. Where GDPR applies, its Articles 5 and 13 cover processing principles and information to provide when collecting personal data ([official EUR-Lex text](https://eur-lex.europa.eu/eli/reg/2016/679/oj/eng/)). Applicability and the actual notice must be determined by the responsible operator with qualified advice; this roadmap is not a legal determination.
