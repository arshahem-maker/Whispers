# Whispers release roadmap

Status checked 25 November 2026. This roadmap supersedes the earlier mixed
Supabase/Lovable checklist. Historical test results remain in
`TESTING-RESULTS.md` and are not proof of the current Neon build.

## Confirmed

- `staging/neon` is pushed to GitHub; `main` does not yet include it.
- A separate Neon Free-plan project, `Whispers Staging`, has an empty `main`
  database. It does not copy production rows or private files. The 13 checked-in
  migrations are applied, and Neon Auth, Object Storage, Functions, Realtime,
  AI Gateway, and the hourly retention trigger are provisioned.
- Staging checks returned HTTP 200 from the database health Function and Neon
  Auth session endpoint, HTTP 401 from unauthenticated submission/reviewer
  endpoints, and passed a temporary Object Storage put/get/delete check.
- GitHub draft PR #2 contains the Neon implementation. CI passed typecheck,
  lint, tests, disposable Postgres/Neon migration checks, and production build.
- The hosted `workers.dev` home and `/pilot` respond, but full sign-in and
  report workflows have not been verified on the current deployment.
- The Lovable project is unpublished and its managed Supabase database remains
  enabled. Supabase must not be disabled until a verified data cutover.
- Real-source intake is not approved or enabled.

## Next work, in order

1. **Finish staff sign-in setup.** Configure a Whispers-owned Google Web OAuth
   client for the staging Auth URL and local/hosted staging origins. Add
   authorized test accounts, then verify invitations, role scoping, and
   workspace access. The current Neon Auth provider is Google's shared
   development credential and is not suitable for hosted release.
2. **Connect the staging host.** Point the staging Cloudflare Worker at the
   staging Function URL, and set the staging-only backend secret and
   `WHISPERS_PILOT_BACKEND=neon`. Keep the production Worker and secrets intact.
   The local staging environment currently allows only `http://localhost:3000`.
3. **Choose and sync the release source.** Verify which Git branch Lovable
   tracks. Review draft PR #2 (which overlaps pilot-hardening PR #1), resolve
   any review findings, and keep it draft until staging workflows and human
   gates are complete. CI passed on its current head.
4. **Complete and prove the Neon-only path.** Verify Worker environment flags
   and Function configuration. Port translation preparation to Neon Auth,
   Neon Postgres, and an approved AI provider, or keep it unavailable. Keep
   voice disabled until its Neon path and cost controls are implemented and
   reviewed. Identify and remove runtime Supabase dependencies only after each
   route has a tested Neon replacement.
5. **Reconcile legacy data.** Inventory the Lovable/Supabase tables, users, and
   private files; export and import only data that must be retained. Compare
   record and attachment counts, verify staff identity mapping, and rehearse a
   restore. The repository's import procedure exists, but this audit did not
   verify a snapshot or imported-data reconciliation.
6. **Run current staging verification.** With fictional fixtures and separate
   citizen, reviewer, expert, publisher, and administrator accounts, verify
   submissions, private-code follow-up, photo retry/viewing, removal, retention,
   invitations, editorial review, publication withdrawal, scheduled cleanup,
   and restore. Update `TESTING-RESULTS.md` with exact revision and results.
7. **Complete human release gates.** Obtain named native-language, security,
   legal/privacy, safeguarding, and operational reviews; confirm the operator,
   incident escalation, retention policy, and monitoring. Keep real intake
   disabled until these reviews and the technical checks are complete.

## Current blockers

- The Neon Auth provider is still Google's shared development credential; no
  Whispers OAuth client is configured.
- The staging project has no tester accounts, Cloudflare staging secrets, or
  imported legacy data. Google OAuth setup and hosted authenticated workflows
  require manual provider/account setup.
- Lovable still reports Supabase enabled. Translation preparation and voice
  still depend on Lovable/Supabase code paths; neither is Neon-complete.
- AI Gateway is provisioned but no model calls are available until credits are
  purchased. No credits were purchased; voice remains disabled.
- Current Neon end-to-end tests, production data migration, private-media
  restore, and human release reviews are not verified.
