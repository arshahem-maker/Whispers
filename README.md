# Whispers

Whispers is an independent humanitarian reporting and review application. It
supports a fictional demonstration, private report follow-up, workspace-scoped
review, private media, and reviewed public updates.

## Current release status — 25 November 2026

- `staging/neon` is the current Neon implementation branch. The production
  Neon project remains separate. A second Free-plan project, `Whispers Staging`,
  provides the app schema and Neon services. A restricted source snapshot is
  stored in its private `whispers_legacy_import` schema for preflight; no legacy
  report rows have been activated in the app tables, and private photo bytes
  have not been transferred. The local `.neon` and `.env.local` still point to
  production; use the ignored `.env.staging.local` for staging-only work.
- The Lovable project is not published, and its managed Supabase database is
  still enabled. Do not disable it until the data and private-file migration
  has been reconciled and restored successfully.
- Real-source intake remains disabled. The hosted `workers.dev` site is a
  staging preview; an HTTP 200 response does not verify sign-in or report flows.

## Local development

```sh
git clone <this-repository-url>
cd <repository-name>
npx bun@1.4.5 install --frozen-lockfile
npm run dev
```

## Built with

- TanStack Start
- TypeScript
- React
- Tailwind CSS

## Archived Supabase pilot instructions

The earlier Supabase and Render pilot steps below are kept for historical
reference only; do not follow them for the Neon deployment. The checked-in
Neon migration runner has applied
`drizzle/proposed/0006_pilot_release_blockers.sql` to isolated Neon staging.
The active Neon setup and current release gates are documented below.

### Legacy Render and Supabase configuration — do not use for new deployments

The Render Blueprint targets one Free Node web service on the pilot branch. Use a separate Supabase Free project for PostgreSQL, Auth, and private storage. The browser and server Supabase URL and publishable key must point to that same staging project. Keep the service-role key server-only. The Blueprint generates separate secrets for intake throttling and the retention endpoint, so text intake can work without an AI gateway key.

In staging Supabase, create the private `whispers-private` bucket, apply the reviewed migrations, and configure Google OAuth with the hosted `/pilot` redirect. Use a scheduled GitHub Actions job or an existing scheduler for the authenticated retention endpoint after the staging host and secret are configured. Export the database and private storage separately for restore testing.

### Neon setup and staging safeguards

The Git branch `staging/neon` is not a Neon database branch. The production
Neon project has only `production`; its `.neon` link and `.env.local` remain
unchanged. A separate Free-plan `Whispers Staging` project has its own `main`
branch, and the 14 checked-in migrations have been applied there. Its Auth,
Object Storage, Functions, Realtime, and AI Gateway are provisioned. Schema-only
branch creation was rejected for the production project's legacy database
role, so staging was isolated in a separate project. A restricted source
snapshot was copied there for preflight only; report rows remain inactive, and
private files were not copied.

Staging credentials are in the ignored `.env.staging.local`; do not replace the
production `.neon` or `.env.local` link for routine staging work. The staging
migrations were applied with `node --env-file=.env.staging.local
scripts/migrate-neon.mjs`. Use a disposable database for
`bash scripts/test-neon-db.sh`. Run
`bash scripts/test-neon-import.sh` to rehearse missing-file rejection, atomic
rollback, repeat activation, and PostgreSQL dump and restore with fictional
rows and loopback storage. Rehearse private object recovery separately.

Build with `VITE_WHISPERS_REVIEWER_BACKEND=neon` and `VITE_NEON_AUTH_URL` set to
the selected branch's Auth base URL. Set `WHISPERS_PILOT_BACKEND=neon` on the
server. This also selects the Neon public feed and translation cache. Keep
`DATABASE_URL`, `AWS_ACCESS_KEY_ID`, and `AWS_SECRET_ACCESS_KEY` server-only.
The server also needs `NEON_AUTH_BASE_URL`, `NEON_AUTH_JWKS_URL`,
`AWS_ENDPOINT_URL_S3` and `AWS_REGION`. When using a Node host, build with
`NITRO_PRESET=node-server` and start with `node .output/server/index.mjs`.
The existing Render Blueprint above describes the legacy deployment.

Hosted staff sign-in requires the host's exact trusted origin in Neon Auth.
For production, configure a Google OAuth Web application owned by Whispers,
with the Neon Auth base URL followed by `/callback/google` as the authorized
redirect URI. Keep the OAuth client secret in provider settings. After
changing credentials, retest hosted sign-in and the existing staff mapping.

Administrators with all three workspaces can record completed human reviews
under **Manage staff invitations → Release reviews** on the pilot. The
record stores the review type, reference, recording administrator and date.
The panel does not enable real intake.
Invited staff sign in with the matching verified Google account and select
**Accept staff invitations** on `/pilot`. The reviewer page supports workspace
scoped reports, private photos, private notes, status changes, and replies.
Workspace administrators can manage invitations, staff roles, and private
report retention. Editorial workflows include redacted expert requests,
assigned assessments, moderator interpretation, and independent publication
review. Hidden updates expose only a withdrawal record in the public feed.
Voice is disabled in Neon mode until its transcription and moderation path is
ported and verified. Keep real intake disabled.

The Cloudflare pilot delegates staff operations, connected submission, and
receipt actions and uploads to the `whispersapi` Neon Function. Configure the Function
with the exact `WHISPERS_APP_ORIGIN` and a generated
`WHISPERS_BACKEND_SECRET`. Pass that same secret and the deployed
`WHISPERS_BACKEND_URL` to the Worker as server-only secrets. The function
still verifies the user's Neon Auth session and workspace permissions.

`neon.ts` schedules hourly cleanup through the authenticated Neon Function
Trigger on `/scheduled-retention`. For local or alternate hosts,
`POST /api/public/retention` accepts the server-only
`WHISPERS_RETENTION_SECRET` as a bearer token. The deployed Function records the latest attempt and latest success separately
for manual and scheduled runs in `public.whispers_retention_status`. Compare
the two timestamps to detect a failed attempt and check that scheduled
successes continue hourly. The table contains no report IDs or text.
Verify that successful runs are monitored before opening intake.

The restricted source snapshot is available for preflight, but it is not an
active app data import. The importer currently finds five reports, six records,
eight translations, one legacy account, and three private photo references; it
refuses activation because the three private photo objects are missing in Neon
and the legacy account is not mapped to a verified Neon Auth user. Do not
activate rows until both checks pass and the export is reconciled. To stage a
new export, use `node --env-file=.env.staging.local
scripts/store-neon-legacy-snapshot.mjs <local-export.json>`; keep exports out of
Git and retain them only as long as necessary. Transfer private files with
`node --env-file=.env.staging.local scripts/copy-neon-legacy-photos.mjs <downloaded-files>`.
Run `node --env-file=.env.staging.local scripts/import-neon-legacy.mjs` to check
photo completeness, staff identity, and record eligibility. Reconcile the final
source snapshot before running the same command with `--apply`. After activation,
verify report and attachment counts, replay the staff and receipt checks, and
rehearse restore with a disposable environment. Set an explicit access and
retention policy for the restricted snapshot and downloaded files after cutover.
