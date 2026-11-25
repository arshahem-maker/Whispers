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
- The isolated database suites were not rerun for this change set. The current
  hosted Worker was not replaced in this verification.

## Current Neon verification — 25 November 2026

Tested at commit `226a57c` (application code is unchanged since `91260ab`).
These results cover local code and isolated fixtures;
hosted authenticated user workflows are still blocked on a Whispers-owned
Google OAuth client and tester accounts.

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
