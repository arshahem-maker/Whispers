# Whispers

Whispers is an independent humanitarian reporting and review application. It
supports a fictional demonstration, private report follow-up, workspace-scoped
review, private media, and reviewed public updates.

## Current release status — 26 November 2026

- `staging/neon` is the current Neon implementation branch. The production
  Neon project remains separate. A second Free-plan project, `Whispers Staging`,
  provides the app schema and Neon services. A restricted source snapshot is
  stored in its private `whispers_legacy_import` schema for preflight; no legacy
  report rows have been activated in the app tables. All three legacy photo
  objects are copied and byte-verified in private staging storage. The local
  `.neon` and `.env.local` still point to
  production; use the ignored `.env.staging.local` for staging-only work.
- The Lovable project is not published, and its managed Supabase database is
  still enabled. Its source snapshot has not been activated in Neon and its
  report origin remains unverified. Do not disable it until the data and
  restore have been reconciled.
- Real-source intake remains disabled. The hosted `workers.dev` site is a
  public staging preview at
  <https://staging-neon-whispers-neon-pilot.whispers-by-arsh.workers.dev>.
  Cloudflare marks it `noindex`; anyone with the URL can visit it. The home and
  `/pilot` return HTTP 200. Google sign-in has been verified on staging and the
  signed-in administrator can load invitation and retention panels. This does
  not verify reviewer access or citizen report submission.
- The public home and report metadata now describe the fictional demo and warn
  users not to submit real or sensitive information. Worker responses add
  baseline browser security headers; HTML responses are not cached, and
  `workers.dev` responses are marked `noindex` in both Worker and static-asset
  handling.
- The Neon browser entry is 331 kB raw / 103 kB gzip. The legacy Supabase Auth
  client and pilot UI load separately; the public home and Neon `/pilot` do not
  preload the Supabase client. This is a bundle optimization, not a removal of
  the legacy integration or proof of a complete Neon-only migration.
- Neon Function submission and receipt bodies are capped at 64 KiB before JSON
  parsing. The migration runner now stores SHA-256 checksums and rejects future
  edits to recorded migration files. Existing staging migration records have
  been pinned to checksums; this records the current file contents and cannot
  independently prove what historical contents were first applied.
- The dependency lock was updated to remove the current advisories. A Bun audit
  step and weekly Dependabot updates for Bun and GitHub Actions are configured.

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

### Neon setup and staging safeguards

The Git branch `staging/neon` is not a Neon database branch. The production
Neon project has only `production`; its `.neon` link and `.env.local` remain
unchanged. A separate Free-plan `Whispers Staging` project has its own `main`
branch, and the 14 ordered migrations have been applied there. Its Auth,
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
server. This selects the Neon public feed. Translation preparation and voice
are unavailable in Neon mode until their supported paths are implemented.
Keep `DATABASE_URL`, `AWS_ACCESS_KEY_ID`, and `AWS_SECRET_ACCESS_KEY`
server-only.
The server also needs `NEON_AUTH_BASE_URL`, `NEON_AUTH_JWKS_URL`,
`AWS_ENDPOINT_URL_S3` and `AWS_REGION`. When using a Node host, build with
`NITRO_PRESET=node-server` and start with `node .output/server/index.mjs`.
The checked-in Render Blueprint is for the earlier pilot and does not describe
the current Cloudflare/Neon staging deployment.

Hosted staff sign-in requires the host's exact trusted origin in Neon Auth.
The staging branch has a Whispers-owned Google OAuth Web client configured with
the exact Neon Auth callback (`<Auth base URL>/callback/google`), and one
authorized test account has signed in successfully. Production uses a separate
Neon project and still needs its own reviewed OAuth configuration before a
production deployment. Keep client secrets in Neon Auth provider settings; do
not put them in Git or the browser bundle.

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

The Cloudflare staging pilot delegates staff operations, connected submission,
and receipt actions and uploads to the `whispersapi` Neon Function. The staging
Function is deployed to the staging branch with the exact preview URL as
`WHISPERS_APP_ORIGIN`; Neon Auth trusts that same origin. The Worker forwards
through server-only `WHISPERS_BACKEND_URL` and `WHISPERS_BACKEND_SECRET`
settings. The function still verifies the user's Neon Auth session and
workspace permissions. These settings apply to staging only; production
configuration remains untouched. The preview URL is public, so keep real
intake disabled and do not put real or sensitive data in it.

The latest hosted checks returned HTTP 200 for `/`, `/pilot`, the staging
database health Function, and the Neon Auth JWKS endpoint. Google sign-in
successfully reached the Neon-backed workspace; the signed-in account has
administrator access but no reviewer role. The unauthenticated reviewer API
returned HTTP 401, and forwarding with the staging backend secret but without a
user session also returned HTTP 401. Citizen submission, assigned reviewer
flows, and private-photo authorization still need separate staging verification.

Translation preparation is not enabled on the Neon path. Staging has no
current-hash Swahili cache: the eight legacy rows are stale and excluded from
import. Do not promise non-English UI until reviewed translations and their
Neon-serving path are implemented.

`neon.ts` schedules hourly cleanup through the authenticated Neon Function
Trigger on `/scheduled-retention`. For local or alternate hosts,
`POST /api/public/retention` accepts the server-only
`WHISPERS_RETENTION_SECRET` as a bearer token. The deployed Function records the latest attempt and latest success separately
for manual and scheduled runs in `public.whispers_retention_status`. Compare
the two timestamps to detect a failed attempt and check that scheduled
successes continue hourly. The table contains no report IDs or text.
Verify that successful runs are monitored before opening intake.

The restricted source snapshot is available for preflight, but it is not an
active app data import. The source snapshot has five reports, six records,
eight Swahili translation-cache entries, one legacy account, and three private
photo references. Those cached translations use an obsolete catalog hash and
are excluded from activation because this cache is rebuildable. Import preflight
refuses activation because the three private photo objects are missing in Neon
and the legacy account is not mapped to a verified Neon Auth user. The source's
`fictional` field is set by application code and is not proof of report content;
the report text has not been reviewed. Do not activate rows until a responsible
operator reviews the source data, attests that it is synthetic, and both photo
and identity checks pass. The final command requires
`--apply --confirm-fictional-source`. To stage a new export, use
`node --env-file=.env.staging.local
scripts/store-neon-legacy-snapshot.mjs <local-export.json>`; keep exports out of
Git and retain them only as long as necessary. Transfer private files with
`node --env-file=.env.staging.local scripts/copy-neon-legacy-photos.mjs <downloaded-files>`.
Run `node --env-file=.env.staging.local scripts/import-neon-legacy.mjs` to check
photo completeness, staff identity, and record eligibility. Reconcile the final
source snapshot before running the same command with `--apply
--confirm-fictional-source`. After activation,
verify report and attachment counts, replay the staff and receipt checks, and
rehearse restore with a disposable environment. Set an explicit access and
retention policy for the restricted snapshot and downloaded files after cutover.
