# Whispers verification results

## Production app deployment and retention schedule — 28 November 2026

- Production migrations 0012 and 0013 were applied transactionally to the
  explicitly selected Neon `production` branch. The migration ledger now has
  15 entries with the expected checksums. Production report and record data
  were not read or changed; the full-release intake flag remains `false`.
- GitHub PR #23's build-mode correction was deployed to the production Worker
  at `https://whispers-neon-pilot.whispers-by-arsh.workers.dev` (Cloudflare
  version `07644e45-995f-4e9c-a436-8cc6524102ff`, app commit
  `12f2ea229f0acafc354a9a173b9bd19d9be1d928`). `/`, `/report`, `/pilot`,
  `/partners`, `/help`, and `/about` returned HTTP 200; the unauthenticated
  reviewer route returned HTTP 401. HTML included a nonce-based CSP,
  `Cache-Control: no-store`, `X-Frame-Options: DENY`,
  `X-Content-Type-Options: nosniff`, HSTS, and `X-Robots-Tag: noindex`.
- The application now uses the production Neon Auth URL in its production
  build. A staging-mode build was checked to use the separate staging Auth
  URL. This verifies build configuration and public routes, not an authenticated
  end-user or reviewer workflow.
- Neon’s own `whispers-retention` scheduled function is configured hourly and
  its production status records a successful run at `2026-11-28T17:00:03Z`.
  A duplicate Cloudflare retention route exceeded the Worker CPU limit, so this
  change removes that duplicate route and explicitly clears its Cloudflare cron.
  No expired production reports or due media jobs were present in the read-only
  aggregate check; no report content was processed by the failed request.
- Local checks on the cleanup branch passed: `npm run build`,
  `npm run typecheck`, `npm run lint`, and `npm test` (40 tests across 11
  files); Wrangler production dry-run and `git diff --check` also passed.
  The cleanup change still needs its merge and production deploy before the
  Cloudflare cron is considered disabled.

## Standalone build and staging retention auth — 26 November 2026

- PR #18 replaced the Lovable-specific Vite wrapper with direct TanStack Start,
  React, Tailwind, and Nitro configuration and removed the wrapper dependency.
  It was merged to `main` and synchronized to `staging/neon` at
  `fdb7becfe3d08948b665f546217ec836da76523d`.
- Local verification passed: `npm run typecheck`, `npm run lint`, 49 tests
  across 14 files, and `npm run build -- --mode staging`. Local Vite smoke
  requests to `/` and `/pilot` returned HTTP 200. Both GitHub Verify checks
  passed: [run 45862852825](https://github.com/arshahem-maker/Whispers/actions/runs/45862852825)
  and [run 45862861142](https://github.com/arshahem-maker/Whispers/actions/runs/45862861142).
- The staging Preview was refreshed at
  <https://staging-neon-whispers-neon-pilot.whispers-by-arsh.workers.dev>;
  latest version URL:
  <https://924b05af-whispers-neon-pilot.whispers-by-arsh.workers.dev>.
  `/`, `/report`, `/help`, `/about`, `/partners`, and `/pilot` returned HTTP
  200. The unauthenticated reviewer endpoint and retention endpoint returned
  HTTP 401. No report or cleanup operation was run.
- The staging-only `WHISPERS_RETENTION_SECRET` is stored in the local ignored
  `.env.staging.local` and on the `staging-neon` Worker Preview. It is not set
  on the production Worker. A normal preview refresh preserved it. This enables
  authorized use of the optional HTTP retention endpoint; scheduled retention
  continues to use the Neon Function Trigger.
- This deploy changes build tooling and staging-only configuration. It does
  not make anonymous intake available, validate production configuration, or
  remove legacy Supabase code. The build still includes legacy Supabase/AI
  server modules for compatibility; PR #18 only removes Lovable's build-time
  Vite dependency. Wrangler reports the Preview command as open beta.

## Connected staging refresh — 26 November 2026

- Refreshed the Cloudflare staging Worker from the current connected-build
  candidate. Cloudflare version `1103ea61` is at
  <https://1103ea61-whispers-neon-pilot.whispers-by-arsh.workers.dev>; the
  stable preview remains
  <https://staging-neon-whispers-neon-pilot.whispers-by-arsh.workers.dev>.
- Staging Neon reports `mode=real` and `partnerDemo=true`. This server-side
  mode is limited by the existing staging database and allowlist to one
  authorized account. Public visitors cannot submit. Photos and public
  sharing are disabled; the full release gate remains off. A clearly labeled
  synthetic test report was created and removed through the connected user and
  reviewer flows; production services and data were not changed.
- Read-only route checks returned HTTP 200 for `/`, `/report`, `/help`,
  `/about`, `/partners`, and `/pilot`. The responses had the expected
  content-security policy, `Cache-Control: no-store`, and `X-Robots-Tag:
  noindex`. The connected home and report routes no longer default to the
  browser-only fictional path.
- A signed-in end-to-end staging check submitted a clearly labeled synthetic
  report through the connected form, confirmed receipt and private-code access,
  requested removal, and removed the record from the reviewer workspace. A
  refreshed workspace showed no reports remaining. No real case information
  or photos were used. Private-media behavior remains untested and unavailable
  in this partner-demo mode.
- Local verification after the UI and mode changes passed: 49 tests across
  14 files, type checking, lint, and the staging production build. This checks
  the code and routes but does not substitute for production release review.

## Owner-run fictional demo preview — 26 November 2026

- Published a separate Cloudflare Preview at
  <https://owner-demo-whispers-neon-pilot.whispers-by-arsh.workers.dev> using
  `wrangler.demo.jsonc` and Wrangler's `--ignore-base-config` option. The
  tested app source was commit `2d2976c0197f9a4734187d496d409acd337cf958`
  (unique Preview version URL:
  <https://ac3a0684-whispers-neon-pilot.whispers-by-arsh.workers.dev>).
  PR #8 merged this source into `main` as `988e1cd`.
  The
  dedicated configuration has no Neon bindings or secrets. The build hides
  the connected-cloud intake toggle; reports stay in the browser's in-memory
  demo store and reset on refresh. The preview remains publicly reachable by
  URL and is marked `noindex`; it is not a private access boundary.
- The account owner completed the browser flow using a wholly invented
  scenario: report entry, review of the summary, fictional confirmation, save,
  switch to a named but fictional reviewer role, open the report, assign it,
  and save an internal note stating no real sources or independent review were
  used. The UI showed the synthetic report in the reviewer inbox and its detail
  page. The status remained unassessed; no evidence or release approval was
  recorded. The record exists only in that browser's demo state.
- During the first trial, the fictional confirmation checkbox also enabled the
  connected path and the page copy still referred to the old real-information
  staging mode. No report was sent through that path. The demo build now hides
  the connected toggle and explains the owner-run simulated review flow.
- Hosted route checks returned HTTP 200, `X-Robots-Tag: noindex`, and a CSP for
  `/`, `/about`, `/partners`, `/report`, `/help`, and `/review/reports` on the
  isolated demo preview.
- Local validation after the demo-only change passed `npm run typecheck`,
  `npm run lint`, and `npm test` (49 tests across 14 files). The demo production
  build and Cloudflare Preview upload completed successfully. GitHub Verify
  also passed on merged source commit `988e1cd` in run 45802150296. This validates
  the owner-run demonstration, not connected Neon submission, private media,
  reply, removal, retention, recovery, or any real-world operation.
- A follow-up boundary review found connected-staging wording and entry points
  still visible in the isolated demo. The owner-demo `/pilot` route is now an
  explanatory page, `/review/sign-in` offers clearly labelled fictional roles
  without external sign-in, and the reviewer shell hides its connected-pilot
  link. Home, report metadata, and the privacy FAQ now describe the isolated
  browser-only behavior accurately, including that report text is not sent to
  the app server. Direct browser checks confirmed `/`, `/help`, `/pilot`,
  `/review/sign-in`, and `/review/reports`; the reviewer page showed an access
  gate for a non-reviewer role, and no report was created. The updated Preview
  is at the same public URL; its unique version URL is
  <https://4706a6fe-whispers-neon-pilot.whispers-by-arsh.workers.dev>.
- The follow-up passed `npm run typecheck`, `npm run lint`, and `npm test`
  (49 tests across 14 files), and `npm run deploy:demo` built and uploaded the
  isolated preview successfully. Vite still prints the upstream
  `vite-tsconfig-paths` compatibility notice; Wrangler also identifies
  `preview` as an open-beta command. The isolated preview remains public to
  anyone with its URL and is not an access-control boundary.

## Connected staging intake safeguard — 26 November 2026

- Redeployed the `whispersapi` Neon Function to the separate staging project
  `wild-mountain-69998844`, branch `br-winter-butterfly-bgqazjbj`. Neon reported
  deployment ID 8 completed with runtime `nodejs24`.
- Both `WHISPERS_LIVE_INTAKE_ENABLED` and
  `WHISPERS_PARTNER_DEMO_REAL_INTAKE_ENABLED` are explicitly set to `false` in
  this staging deployment. Fictional connected tests remain supported for the
  single allowlisted test account. The production Neon project and production
  Cloudflare Worker were not changed.
- This is a deployment/configuration check, not a full connected submission
  test. Before any real-world use, keep intake off until accountable
  organizational operations and qualified independent reviews are in place.

## Content Security Policy nonce deployment — 26 November 2026

- Application commit `c26ca44c7c94f0b74aa272b81453a0dfc60b5825` deployed to the existing Cloudflare staging Preview only. Its script policy no longer includes `unsafe-inline`; Cloudflare's streaming HTMLRewriter adds a per-response nonce to SSR script/style elements and provides the nonce to the client runtime.
- `npm run typecheck`, `npm run lint`, `npm run build -- --mode staging`, and `git diff --check` passed locally. The build retains the upstream `vite-tsconfig-paths` compatibility notice.
- GitHub Verify passed on this exact revision in [runs 45788162408](https://github.com/arshahem-maker/Whispers/actions/runs/45788162408) and [45788154662](https://github.com/arshahem-maker/Whispers/actions/runs/45788154662), including typecheck, lint, tests, database/import checks, and production build.
- Hosted HTML for `/`, `/partners`, `/help`, `/report`, and `/pilot` returned HTTP 200. Each response had a nonce-based `script-src`, and all four rendered script tags had the exact nonce named by the response CSP; the inserted `csp-nonce` meta tag matched it. The page had `no-store`, `nosniff`, and `X-Robots-Tag: noindex` headers. Unauthenticated reviewer API access returned HTTP 401 and `no-store`.
- A signed-in browser rendered the connected pilot workspace, reviewer/admin panels, and zero reports without breaking hydration. No report was submitted, no staff/data mutation was performed, and no production deployment or configuration was changed.
- Inline style attributes remain allowed by `style-src` for the current styling framework; removing them is a separate UI/security review item before production. The staging preview is public despite `noindex`.

## Staging boundary and partner-evaluation update — 26 November 2026

- Application revision `22dac77ad6125fce84fd4942ab3577a8b5351cce` was built and
  deployed to the existing Cloudflare staging Preview at
  <https://staging-neon-whispers-neon-pilot.whispers-by-arsh.workers.dev>.
  The separate version URL is
  <https://63329a3e-whispers-neon-pilot.whispers-by-arsh.workers.dev>.
- Local verification passed: `npm run typecheck`, `npm run lint`, `npm test`
  (49 tests across 14 files), and `npm run build`. One concurrent run had a
  5-second timeout in the existing language-picker test while four checks were
  running; an isolated rerun passed all 49 tests. The build retains the existing
  `vite-tsconfig-paths` compatibility notice.
- Hosted read-only checks returned HTTP 200 for `/`, `/partners`, `/help`,
  `/report`, and `/pilot`; the unauthenticated reviewer API returned HTTP 401.
  HTML responses carried the updated CSP and `X-Robots-Tag: noindex` on the
  public `workers.dev` domain. The partner route rendered its current status,
  safety limits, and email link. No contact was sent and no report was created.
- A signed-in staging browser session displayed the restricted-staging warning,
  reviewer/admin panels, and zero available reports. The connected reviewer
  page no longer displays the fictional-demo banner. This confirms route rendering
  and session-backed workspace reads; it does not exercise citizen submission,
  reviewer action, removal, or private-media authorization end to end.
- The browser CSP now limits default resources to the app origin, restricts
  connections to the staging and production Neon Auth origins, and blocks
  objects/frames. Inline scripts and styles remain permitted because the current
  server-rendered app does not yet supply per-response CSP nonces.
- Production was not deployed or modified. The one-account, unmonitored staging
  intake boundary and full-release gate are unchanged. This statement records
  the historical state of the 26 November staging-only deployment; see the
  28 November production deployment entry above for current status.
- GitHub Verify passed for this pushed revision in runs
  [45781044608](https://github.com/arshahem-maker/Whispers/actions/runs/45781044608)
  and [45781036447](https://github.com/arshahem-maker/Whispers/actions/runs/45781036447).

## Restricted staging partner-demo intake — 26 November 2026

- Commit `1c56655f7c0f84f6e28695f903c483a9bb4e5ce8` enables real-information
  intake only in the isolated staging partner-demo mode. GitHub Verify passed
  on this commit: [run 45775043702](https://github.com/arshahem-maker/Whispers/actions/runs/45775043702).
- The protected staging intake-status endpoint returned HTTP 200 with
  `mode=real` and `partnerDemo=true`. Home, report, report-review, help, and
  pilot routes returned HTTP 200. The preview remains `noindex` and is public
  to anyone with its URL.
- A fresh authenticated browser session showed the sole allowlisted account's
  reviewer workspace, invitation controls, and retention panel. The workspace
  reported no reports available or awaiting review. No fabricated test report
  or human review was created.
- The server allows this mode only when the backend is connected to the
  configured staging database and exactly one account is allowlisted. The full
  release gate and production intake remain off. Partner-demo reports are
  private, cannot be published, and reject photos and follow-up messages; users
  can request removal with their private code. The flow clearly states that no
  one monitors submissions or guarantees a response.
- Citizen submission, assigned reviewer actions, and private-photo
  authorization have not been exercised end to end. Do not treat this preview
  as a public reporting or emergency response service.

## Staging retention correction deployment — 26 November 2026

- Deployed the updated Neon policy to the explicit staging project
  `wild-mountain-69998844`, branch `main`, using `.env.staging.local`. Production
  project `flat-firefly-70862043` was not targeted. Neon reports the updated
  `whispersapi` deployment (ID 5) and health Function deployment (ID 4)
  completed at 05:31 UTC.
- The staging health Function returned HTTP 200 with `{"ok":true}`. An
  unauthenticated POST to the manual retention route returned HTTP 401, as
  expected, without invoking cleanup. The boundary regression tests described
  below cover behavior just before and after the 24-hour grace period.
- The scheduled cleanup was not manually invoked as a test. The hourly trigger
  ran at `2026-11-26T06:00:01.668Z`, succeeded, and recorded zero expired
  reports. Hosted checks prove deployment and authorization behavior; the test
  suite proves the grace boundary. GitHub Verify workflow run 112 passed on
  commit `7d73c96` before these deployment-note edits.

## Local retention-grace correction — 26 November 2026

- Fixed the Neon cleanup worker so revoked media is not listed or deleted until
  24 hours after the report's original `revoked_at` time. The worker now uses
  that timestamp for revoked reports, even if retries refresh the queue time.
- Added regression checks for a revoked report just inside the grace period and
  one just beyond it. The full Vitest suite passed: 49 tests across 14 files.
  Typecheck, lint, and the production build also passed.
- This correction is committed and pushed to `staging/neon` as `b70f9c1` and is
  now deployed to the staging Neon Function as noted above.

## Legacy fictional data cleanup — 26 November 2026

- The original Lovable Supabase source contained five reports, all explicitly
  marked fictional, with six linked records, including three private photos.
  None had linked expert requests or public updates. Report text and photo
  contents were not inspected.
- At the owner's direction, the three files were removed through the Supabase
  Storage API. The five reports and six linked records were then deleted in one
  database transaction. Independent aggregate verification returned zero
  remaining report rows, linked records, private bucket objects, expert
  requests, or public updates. The entire private bucket is empty. No accounts,
  role rows, unrelated storage, or project settings were changed.
- The Lovable-managed Supabase database remains enabled. This cleanup does not
  verify that the rest of the old project can be disabled safely.
- A read-only aggregate inventory of the remaining source database found one
  auth user and one active admin role (the owner account already has a Neon
  admin mapping); one expired, revoked, unaccepted expert invitation; eight
  ready Swahili translation-cache rows with a stale catalog; a voice control
  paused after status 402; and a release flag with live intake disabled. Eleven
  audit events remain for historical pilot submissions, contributor messages,
  and staff/operator actions. No reports, linked records, expert requests,
  public updates, or private storage objects remain. Report text, photo contents,
  translation phrases, contact details, and audit UUIDs were not inspected.
- The historical audit entries should be preserved or explicitly dispositioned
  before disabling the old database. The expired invitation and stale
  translation cache are not active app state; voice stays disabled in Neon.

## Legacy audit metadata archive — 26 November 2026

- Copied the 11 remaining source audit events to the restricted
  `whispers_legacy_import.snapshots` table on Neon staging
  (`wild-mountain-69998844`, branch `main`) in one transaction. The insert
  reported `INSERT 0 1`; a follow-up aggregate returned `archived_events = 11`;
  the transaction committed successfully. The archive preserves source event
  identifiers, actor identifiers, action/target metadata, workspace, outcome,
  and timestamps.
- This was a metadata-only archive. Report text, photo contents, translation
  phrases, contact details, and audit UUIDs were not inspected. Source audit
  rows were not deleted, and the Lovable-managed database remains enabled.
  This archive does not establish that the old project's database or settings
  can be retired safely.
- The expired invitation and stale Swahili translation cache remain in the old
  source. They are not active Neon app state; no translation data was copied.

## Current branch verification — 26 November 2026

- GitHub Verify run 118 passed on commit `0358dd1e39a3117893a689e18ca8165bc24451f6`:
  [workflow run 45764941485](https://github.com/arshahem-maker/Whispers/actions/runs/45764941485).
- The source audit metadata archive was separately confirmed to contain 11
  events. The retention trigger's 06:00 UTC execution succeeded with zero
  expired reports. No cleanup was manually triggered.

## Staging access and data audit — 26 November 2026

- A guarded, read-only audit confirmed all 14 recorded migrations are present.
  The scheduled retention function last succeeded at 01:00 UTC on 26 November
  and expired zero reports in that run.
- Before this check, the verified Google owner account could sign in but had no
  active staff role. The account was matched to its verified Neon Auth identity
  and granted the initial administrator role for the `ua`, `td`, and `general`
  workspaces on the isolated staging database. Three audit entries record the
  bootstrap. The existing signed-in staging session then showed the staff
  invitation, release-review, and retention controls. No production database
  was touched.
- A separate active staging report in `general` had an application-set
  `fictional=true` marker and no attached records. Its source was unknown, so
  the admin retention action revoked it, redacted its stored body, and queued
  the private-storage cleanup. No report content was inspected. The live app
  now has zero active reports. The older deployed worker did not honor the
  documented 24-hour media grace period. The `b70f9c1` correction has since been
  deployed; its next scheduled cleanup run is the live retention-path check.
  Reviewer access and citizen follow-up remain unverified.
- At the owner's direction, the five-report restricted snapshot and its three
  private photo copies were deleted from Neon staging. Verification confirmed
  zero remaining snapshots, zero active app reports, and deletion of all three
  photo objects. The original Lovable Supabase source remains enabled; its five
  fictional reports and three photos have since been deleted as recorded above.
  No report contents were inspected.

## Bundle and hosted route verification — 26 November 2026

The Neon-only browser entry previously carried the legacy Supabase Auth client
because the root route and global function middleware imported it eagerly. The
legacy pilot screen also shared a route chunk with the Neon workspace. Changes
in `da1df96` and `614b942` defer those legacy modules to their own async paths.

- Staging build entry changed from 552.64 kB raw / 159.75 kB gzip to
  331.17 kB raw / 103.07 kB gzip (221.47 kB raw and 56.68 kB gzip smaller).
- The 220.32 kB raw Supabase compatibility client is emitted separately. The
  home page and `/pilot` HTML do not preload it; the built entry no longer
  contains Supabase Auth code. `/pilot` loads the Neon reviewer workspace.
- The public staging home and `/pilot` returned HTTP 200 with `no-store`,
  `nosniff`, and `DENY` headers. The unauthenticated reviewer API returned HTTP
  401 with the same headers. The legacy `/review/sign-in` route returned HTTP
  307 to `/pilot` before serving its Supabase-backed component. No authenticated
  reviewer or citizen workflow was exercised.
- Typecheck and lint passed; lint has zero errors and zero warnings. Vitest
  passed all 47 tests across 13 files. Staging and default builds passed.
- GitHub Verify passed on `614b942c16e22435e99b924676f9282c5b679c17`:
  [run 45735838043](https://github.com/arshahem-maker/Whispers/actions/runs/45735838043)
  and [run 45735845176](https://github.com/arshahem-maker/Whispers/actions/runs/45735845176).
- `npm run deploy:staging` updated only the public Cloudflare Preview. One
  attempt failed on a transient network request after uploading assets; retry
  completed successfully. Production was not changed.
- The Vite wrapper still prints its `vite-tsconfig-paths` compatibility
  notice. The wrapper owns that plugin configuration, so it was not changed.

AI Gateway credits were not purchased or used. The Lovable project remains
unpublished, its latest revision is behind `staging/neon`, and its Supabase
database is enabled. No Lovable AI edit was started because it would act on
that stale project copy.

## Release hardening — 25 November 2026

Changes after the previous verification include public fictional-demo copy,
Worker and static-asset security headers, a 64 KiB Neon Function JSON limit,
SHA-256 migration checksums, bounded voice-result arrays, refreshed dependencies,
and the React lint fixes. Verification on the updated working tree:

- `npm run typecheck` passed.
- `npm run build` passed. The build still prints the upstream notice that
  `vite-tsconfig-paths` can be replaced by Vite's native path resolution; the
  Lovable Vite wrapper owns this plugin configuration, so no unverified wrapper
  change was made.
- `npm run lint` passed with 0 errors and 11 existing Fast Refresh
  export-pattern warnings.
- `npm test` passed: 42 tests across 11 files. Node emitted its existing
  experimental `localStorage` warning for two workers.
- `npx bun@1.4.5 audit` found no vulnerabilities in 639 locked packages.
- `node --env-file=.env.staging.local scripts/migrate-neon.mjs` completed with
  0 new migrations and initialized checksums for already-recorded staging
  migrations. The database returned a benign notice that the migration ledger
  already existed.
- The staging migration ledger reports 14 records and all 14 have checksums.
- `npm run deploy:staging` updated only the public staging Preview. The live
  home, `/report`, and `/pilot` returned HTTP 200; the unauthenticated reviewer
  endpoint returned 401 and the wrong-method photo request returned 405.
  These responses included the new security headers. The home showed the new
  fictional-demo wording. A static JavaScript asset also returned the security
  headers and retained its immutable cache policy.
- GitHub Verify completed successfully on commit `1eeced736a121b685068588e1fbcada5900d39a9`:
  [run 45642222658](https://github.com/arshahem-maker/Whispers/actions/runs/45642222658),
  [run 45642208743](https://github.com/arshahem-maker/Whispers/actions/runs/45642208743).
- The isolated database suites ran in GitHub CI; no authenticated Google OAuth
  or human reviewer workflows were exercised by this change set.

## Hosted Google OAuth check — 25 November 2026

- The Google Auth Platform project contains a Whispers staging Web OAuth client.
  Its authorized redirect URI matches the staging Neon Auth callback, and the
  Neon staging branch reports the same Google client ID. The client secret was
  not displayed or written to the repository.
- Added one authorized test account in Google's **Testing** audience. It appears
  as `1 user (1 test, 0 other) / 100 user cap`.
- Signed in through Google on the public staging preview. The Neon-backed
  workspace showed the signed-in session, staff invitation controls, release
  review status, and private retention queue. This verifies OAuth and the
  administrator-scoped reads for that session.
- The account has no reviewer role. Reviewer report visibility, private-photo
  reads, replies, role-scoped reviewer invitations, and citizen submission were
  not exercised. Four human release review types remain pending. Real intake
  stays disabled.
- The Neon CLI confirmed the staging Google provider is configured. A staging-
  only migration check after the migration-file cleanup reported 0 new
  migrations; the existing staging ledger remains at 14 recorded migrations.

## Current GitHub verification — 25 November 2026

- GitHub Verify passed on the synchronized `staging/neon` head after updating
  `actions/checkout` and `actions/setup-node` to their Node 24-compatible v7
  releases and enabling manual workflow runs. After the Neon language-control
  fix, the latest run checked out the exact branch commit and passed dependency
  audit, typecheck, lint, 44 unit tests,
  isolated pilot and Neon database suites, import rehearsal, and production
  build: [run 45659433038](https://github.com/arshahem-maker/Whispers/actions/runs/45659433038).
- The prior Node 20 runtime deprecation annotation is gone. Lint still reports
  11 Fast Refresh export-pattern warnings and no errors.
- The branch and PR #2 now point to the same commit. The older open draft PR #1
  was closed as superseded because its commits are included in PR #2.
- Two focused `LanguageButton` tests verify that Neon displays a non-interactive
  English-only status and the legacy backend retains its selector. The staging
  preview deployed successfully, and the public home page displayed that
  status. No production configuration or data was changed.

## Earlier local Neon verification — 25 November 2026

Tested at commit `226a57c` (application code is unchanged since `91260ab`).
These results cover local code and isolated fixtures;
the later hosted OAuth check above supersedes the hosted-authentication status
recorded at that time.

- TypeScript typecheck passed.
- ESLint passed with 0 errors and 11 Fast Refresh export-pattern warnings.
- Vitest passed: 42 tests across 11 files.
- Production build passed. Vite emitted a notice that the Lovable-provided
  `vite-tsconfig-paths` plugin can be replaced by native path resolution;
  the app configuration comes from the Lovable Vite wrapper, so this was left
  unchanged.
- Isolated PostgreSQL photo authorization, workspace invitation, and public
  projection checks passed in `scripts/test-neon-db.sh`.
- The Neon pilot quota check also passed: receipt limits enforce their cap,
  message and upload limits remain independent, and an expired window resets.
- The isolated import rehearsal passed fictional-only gating, missing-photo
  rejection, stale translation skip, atomic rollback, verified owner mapping,
  idempotent activation, and backup/restore checks in
  `scripts/test-neon-import.sh`.
- Hosted staging checks from 25 November returned HTTP 200 for the public home,
  `/pilot`, database health Function, and Neon Auth JWKS. The unauthenticated
  reviewer endpoint and a forwarded reviewer request without a user session
  returned HTTP 401. This does not prove sign-in or authenticated reporting.

## Historical Supabase pilot test — 16–17 November 2026

Tested against the running preview and its connected fictional Cloud pilot. No
real-source intake was enabled. These findings describe the earlier Supabase
pilot and should not be read as a current Neon test result.

## Passed
- All 38 existing automated tests (10 files), repeated successfully.
- JPEG, PNG and WebP photo selection and preparation; invalid image rejection.
- Opaque masking and cropping verified on re-encoded output pixels (640 × 480 JPEG; covered pixel black).
- Three-photo UI limit, individual removal and replacement.
- Three photo uploads completed in both demo and Cloud modes.
- Demo report submission, private-code opening and lowercase/grouped-code reopening, contributor message readback and removal-request suppression of replies.
- Codes were absent from browser URL, localStorage and sessionStorage in the tested submission flows. This is not a zero-logging or full privacy certification.
- Cloud report without photos opened successfully and a contributor message was saved and read back.
- Voice consent required before recording; recording, stopping and signed challenge succeeded. Terminal credit error was displayed rather than a false success.
- Translation requests did not include the fictional private draft; unprepared custom-language access was denied to a signed-out visitor.

## Failed
- Cloud private-code follow-up after three photo uploads: generic cannot-open error.
- Cloud no-photo report reopened from a fresh tab after initial opening and one contributor message: generic cannot-open error.
- Live English voice processing returned HTTP 402, “Not enough credits”, on both attempts separated by the resumed testing session. The service persisted its paused state. It was resumed once using the owner's administrator UI after checking available balance, but the gateway still refused the fresh request; no further paid requests were attempted.
- Arabic translation returned “Translation unavailable. English is still available.” Server logs confirmed an AI HTTP 402.
- Swahili selection also failed. The eight saved batches have catalog hash `221efdf5f000c7284f6742886849c632`, whereas current static wording hashes to `6bbc206c3bae4b436d7083e8b8e21a65`. They are not reusable for this catalog; new generation remains blocked by credits.

## Confirmed causes and boundaries
- The live `reserve_voice_request` function permits only three calls per bucket per hour and reserves from the voice 150/day budget. Pilot uploads, receipt opens and contributor messages all use it. Three uploads exhaust the receipt bucket before opening; open + message exhaust most of the budget before subsequent opens. Pilot traffic also consumes the voice daily quota. This is separate from the legitimate three-photo storage limit.
- The owner was tested using a restored authenticated administrator session. The staff selector had zero reports. Report content requires a workspace-scoped reviewer role; admin alone does not inherit it. Permissions were not expanded for testing.

## Not verified / blocked
- Authorised reviewer photo download and reviewer reply → citizen readback: no authorised reviewer session available; owner is administrator-only.
- Spanish live transcription, language detection, English prefill and uncertain background-sound analysis: stopped after the English credit denial rather than retrying the unavailable paid service.
- Successful current-catalog translations, RTL after successful translation, cross-page translated wording and English restoration from an active translated state: current catalog generation is unavailable. No claim that every language works or that translations are human-reviewed.
- Mobile coverage, published deployment, retention concurrency and full independent staff workflows were outside this targeted run.

## Next steps
1. Separate pilot operation limiting from voice-processing limits; rerun three uploads → open → contributor message → repeat open.
2. Restore AI gateway funding/access, then explicitly resume voice using the staff control and run English, Spanish and synthetic-background-sound tests.
3. Generate current-catalog translations and verify navigation, RTL, English recovery and privacy isolation.
4. Test photo viewing and reviewer replies with a legitimately invited, workspace-scoped reviewer account.

The tests do not establish production readiness. Real-source intake remains disabled.

# Runtime cleanup — 26 November 2026

- Removed the app's Supabase/Lovable reviewer, auth, report, retention, voice-AI,
  translation, and runtime error-reporting paths, along with direct package
  dependencies. The Neon-authenticated reviewer and report flows remain.
- Voice endpoints now fail closed with a no-store 503 response, and the voice
  recorder UI has been removed so users are not prompted to submit audio that
  cannot be processed. Translation is explicitly English-only until a supported,
  reviewed replacement is implemented.
- The historical Lovable/Supabase project and migration/import artifacts remain
  available for data reconciliation. No remote database, report, account, or
  service was changed. Existing staging report records were not opened or
  modified during this code work.
- `npm run typecheck`, `npm run lint`, and `npm run build -- --mode staging`
  passed locally after the runtime cleanup. GitHub Verify passed on PR #20 in
  [run 45871203107](https://github.com/arshahem-maker/Whispers/actions/runs/45871203107),
  then on `main` in
  [run 45871428000](https://github.com/arshahem-maker/Whispers/actions/runs/45871428000)
  and `staging/neon` in
  [run 45871468556](https://github.com/arshahem-maker/Whispers/actions/runs/45871468556).
  All steps passed, including Bun audit, tests, pilot DB, Neon DB/import, and
  build suites.
- The PR itself made no production change, Neon migration, or Lovable edit. The
  follow-up staging Preview refresh is recorded below.

## PR #20 staging refresh — 26 November 2026

- PR #20 merged as `791c6265b4e71d70491ba2474af29bc9552d7a63`; `main` and
  `staging/neon` now point to that same commit. The staging Cloudflare Preview
  was refreshed from this source. Version URL:
  <https://89a8a8ee-whispers-neon-pilot.whispers-by-arsh.workers.dev>.
- Read-only route checks returned HTTP 200 for `/`, `/pilot`, `/report`,
  `/report/review`, `/help`, `/about`, `/partners`, and `/updates`. The
  unauthenticated Neon reviewer API returned 401; unauthenticated voice and
  voice-challenge requests returned 503; unauthenticated retention returned
  401. The root response carried CSP with a nonce, `Cache-Control: no-store`,
  `X-Robots-Tag: noindex`, `X-Content-Type-Options: nosniff`, and
  `X-Frame-Options: DENY`.
- No authenticated submission/reviewer workflow was run in this refresh. The
  staging report records were not read, modified, or deleted. No production
  Worker, Neon data/schema, or Lovable project was changed.
