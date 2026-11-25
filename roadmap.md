# Whispers release roadmap

Status checked 25 November 2026. This roadmap supersedes the earlier mixed
Supabase/Lovable checklist. Historical test results remain in
`TESTING-RESULTS.md` and are not proof of the current Neon build.

## Confirmed

- `staging/neon` is pushed to GitHub; `main` does not yet include it.
- A separate Neon Free-plan project, `Whispers Staging`, has its own `main`
  database. The 14 checked-in migrations are applied, and Neon Auth, Object
  Storage, Functions, Realtime, AI Gateway, and the hourly retention trigger
  are provisioned. A restricted source snapshot is stored privately for
  preflight; it has not activated legacy data in app tables, and private files
  have not been transferred.
- Staging checks returned HTTP 200 from the database health Function and Neon
  Auth session endpoint, HTTP 401 from unauthenticated submission/reviewer
  endpoints, and passed a temporary Object Storage put/get/delete check.
- Realtime accepted a live `SELECT 1` subscription. It rejected a query against
  an RLS-protected Whispers table; the app currently polls public updates and
  does not use Realtime, so no table policy was weakened to force the test.
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
5. **Reconcile legacy data.** The restricted source snapshot currently contains
   five reports, six records, eight translations, one legacy account, and
   references to three private photos. Import preflight blocks safely because
   no photo bytes are in Neon and no verified Neon Auth user is mapped to the
   legacy account. Obtain the private-file export and complete staff sign-in,
   then compare counts and rehearse restore before activating any data.
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
- The staging project has no tester accounts or Cloudflare staging secrets.
  Legacy records are held only in a restricted preflight snapshot; none are
  active. Google OAuth setup and hosted authenticated workflows require manual
  provider/account setup.
- Lovable still reports Supabase enabled. Translation preparation and voice
  still depend on Lovable/Supabase code paths; neither is Neon-complete.
- AI Gateway is provisioned but no model calls are available until credits are
  purchased. No credits were purchased; voice remains disabled.
- Realtime is provisioned but not used by app flows; the public feed currently
  polls, and RLS-protected tables cannot be subscribed to through the tested
  path.
- Current Neon end-to-end tests, legacy data activation, private-media restore,
  and human release reviews are not verified.
