# Whispers verification results

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
