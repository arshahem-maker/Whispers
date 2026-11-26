# Whispers release roadmap

Status checked 26 November 2026. This roadmap supersedes the earlier mixed
Supabase/Lovable checklist. Current local and hosted guard checks are recorded
at the top of `TESTING-RESULTS.md`; the older Supabase pilot results are clearly
marked historical there.

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
- GitHub draft PR #2 contains the consolidated Neon implementation and pilot
  hardening. Its current branch head is synchronized with `staging/neon`, and
  GitHub Verify passed on the latest workflow changes. The earlier pilot
  hardening PR #1 is closed as superseded, so there is one consolidated draft
  to review. Current typecheck, build, lint, audit, unit test, database and
  hosted Preview results are listed in `TESTING-RESULTS.md`.
- The public staging preview is
  <https://staging-neon-whispers-neon-pilot.whispers-by-arsh.workers.dev> and
  Cloudflare marks it `noindex`. The staging Neon Function is deployed with
  that exact origin, and Neon Auth trusts it. The home, `/pilot`, database
  health Function, and Auth JWKS endpoint returned HTTP 200. The unauthenticated
  reviewer API and a forwarded request without a user session returned HTTP
  401. Google sign-in reached the Neon-backed workspace; the signed-in account
  loaded administrator invitation and retention panels. The first admin role
  has now been provisioned for that verified owner identity on staging and
  logged in the audit table. The account has no reviewer role, so reviewer
  report access and citizen submission remain unverified. The public interface
  now labels the Neon pilot English-only instead of presenting a translation
  control with no working Neon catalog.
- The Lovable project is unpublished and its managed Supabase database remains
  enabled. Supabase must not be disabled until a verified data cutover.
- Real-source intake is not approved or enabled.
- The code now corrects public demo wording, adds Worker/static-asset security
  headers and a request-body ceiling, pins migration file checksums, bounds
  voice-output arrays, and refreshes vulnerable dependencies. Local typecheck,
  build, lint, and Bun audit results are recorded at the top of
  `TESTING-RESULTS.md`. Lint has 0 errors and 0 warnings; Bun audit reported no
  vulnerabilities across the 639 locked packages.
- Commit `520d0ef` is the current pushed staging head. GitHub Verify passed;
  the public home and `/pilot` were smoke-tested. The Neon entry is 331.17 kB
  raw / 103.07 kB gzip, with the 220.32 kB Supabase compatibility client kept
  out of home and Neon pilot preloads. Details are in `TESTING-RESULTS.md`.
- Existing staging migration rows now have SHA-256 checksums for the current
  migration files. Because the old ledger had no checksums, this cannot prove
  historical file contents; subsequent edits to these pinned files will fail.

## Next work, in order

1. **Finish hosted authenticated verification.** Staging now has a Whispers-
   owned Google Web OAuth client, an authorized test account, and a verified
   sign-in, and an administrator role. Use a separate, properly invited
   reviewer account to verify role scoping, workspace access, citizen
   submission, private-code follow-up, and reviewer photo/reply workflows. The
   preview is public to anyone with its URL; keep real intake disabled.
2. **Review the release source.** Lovable's current revision (`2c422d9`) only
   updated its planning file; its previous application-code edit changed one
   test line. Draft PR #2 includes the pilot-hardening commits from PR #1 plus
   the Neon migration. PR #1 is now closed as superseded; review only the
   consolidated PR #2. Keep it draft until authenticated staging workflows and
   human release gates are complete. The Lovable project is unpublished; its
   managed Supabase database is still enabled.
3. **Complete and prove the Neon-only path.** Verify Worker environment flags
   and Function configuration. Port translation preparation to Neon Auth,
   Neon Postgres, and an approved AI provider, or keep it unavailable. Keep
   voice disabled until its Neon path and cost controls are implemented and
   reviewed. Identify and remove runtime Supabase dependencies only after each
   route has a tested Neon replacement.
4. **Reconcile legacy data.** The restricted source snapshot currently contains
   five reports, six records, eight Swahili translation-cache entries, one
   legacy account, and references to three private photos. The cached
   translations have an obsolete catalog hash and are excluded from activation
   because the cache is rebuildable. Import preflight blocks safely because no
   photo bytes are in Neon and no verified Neon Auth user is mapped to the
   legacy account. Their `fictional` marker is application-set, not independent
   proof, and no report text has been reviewed. A responsible operator must
   review and attest the source is synthetic. Obtain the private-file export and
   complete staff sign-in, then compare counts and rehearse restore before
   activating any report data; the importer requires an explicit confirmation
   flag for activation.
5. **Run current staging verification.** With fictional fixtures and separate
   citizen, reviewer, expert, publisher, and administrator accounts, verify
   submissions, private-code follow-up, photo retry/viewing, removal, retention,
   invitations, editorial review, publication withdrawal, scheduled cleanup,
   and restore. Record the exact revision and results in `TESTING-RESULTS.md`.
6. **Complete human release gates.** Obtain named native-language, security,
   legal/privacy, safeguarding, and operational reviews; confirm the operator,
   incident escalation, retention policy, and monitoring. Keep real intake
   disabled until these reviews and the technical checks are complete.

## Current blockers

- Google sign-in works on staging, but only an administrator account is
  available. Reviewer-specific permissions and citizen report flows still need
  a separate authorized test account and end-to-end verification.
- Legacy records are held only in a restricted preflight snapshot; none are
  active. Their source content has not been reviewed, three private photos have
  not been copied, and no verified Neon user has been mapped to the legacy
  account.
- Lovable still reports its Supabase database enabled. The app retains legacy
  Supabase compatibility code; the active Neon path does not use it for the
  tested reviewer, staff, retention, or public-feed flows. Translation
  preparation and voice remain unavailable in Neon mode.
- Neon staging has no current-hash translation cache. The eight legacy Swahili
  entries are stale and deliberately skipped, so non-English interface choices
  remain unavailable until reviewed translations are prepared for Neon.
- AI Gateway is provisioned but no model calls are available until credits are
  purchased. No credits were purchased; voice remains disabled.
- Realtime is provisioned but not used by app flows; the public feed currently
  polls, and RLS-protected tables cannot be subscribed to through the tested
  path.
- Current Neon end-to-end tests, legacy data activation, private-media restore,
  and human release reviews are not verified.
