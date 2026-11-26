# Whispers

Whispers is an early-stage humanitarian reporting and review prototype. The
public experience is a fictional demonstration. Connected real-information
intake is restricted to one authorized staging account and is not monitored or
an emergency response service.

## Current release status — 26 November 2026

- `staging/neon` is the current Neon implementation branch. The production
  Neon project remains separate. A second Free-plan project, `Whispers Staging`,
  provides the app schema and Neon services. The restricted migration snapshot
  and its three private photo copies were deleted from staging at the owner's
  direction. No legacy report rows have been activated in app tables. The local
  `.neon` and `.env.local` still point to production; use the ignored
  `.env.staging.local` for staging-only work.
- The Lovable project is not published, and its managed Supabase database is
  still enabled. All five source reports were explicitly marked fictional and
  have been deleted with their three private photo objects. Verification found
  zero report rows and zero objects in `whispers-private`; no report content was
  inspected. Do not disable the database until remaining app dependencies and
  configuration have been reconciled.
- Full real-source release remains disabled. Staging has a limited partner-demo
  mode for real-information submissions from the single allowlisted account.
  Reports stay private, cannot be published, and do not accept photos or
  contributor follow-up. The screen warns that nobody is monitoring or
  responding; users are told not to submit identifying, sensitive, or urgent
  details. This is a demonstration flow, not an operational reporting service.
  The full release gate still requires an operator and human reviews. Submissions
  remain authenticated and allowlisted; this is not anonymous public intake. The hosted
  `workers.dev` site is a
  public staging preview at
  <https://staging-neon-whispers-neon-pilot.whispers-by-arsh.workers.dev>.
  Cloudflare marks it `noindex`; anyone with the URL can visit it. The home,
  report, report-review, help, and `/pilot` routes return HTTP 200. Google
  sign-in and the allowlisted account's reviewer workspace have been verified.
  The workspace showed no reports awaiting review. Citizen submission has not
  been exercised end to end.
- A **For organizations** page supports partner-evaluation conversations. It
  uses a mail link rather than a form and asks people not to email sensitive
  case details. Organizations still cannot submit reports through staging.
- The operator information describes Whispers as a prototype. The legal
  operator and legal form have not been confirmed, so the app does not claim a
  registered company or present its FAQ as a complete legal privacy notice.
- The public home and report metadata distinguish local fictional demo from
  restricted staging partner demo. Worker responses add
  baseline browser security headers; HTML responses are not cached, and
  `workers.dev` responses are marked `noindex` in both Worker and static-asset
  handling. The browser Content Security Policy is narrower; inline scripts and
  styles remain allowed until the server-rendered app supports response nonces.
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
branch, and the 15 ordered migrations have been applied there. Its Auth,
Object Storage, Functions, Realtime, and AI Gateway are provisioned. Schema-only
branch creation was rejected for the production project's legacy database
role, so staging was isolated in a separate project. A restricted source
snapshot was copied there for preflight. Its five unrecognized reports and
three associated photo copies were later deleted from staging. The original
Lovable Supabase source remains enabled. No report rows are active in Neon.

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
After the server flag is enabled and the operator, all five review areas, and
two independent reviewers are recorded, a separate administrator can activate
full real intake in that panel. The staging partner-demo flag is a separate
restricted mode: only the one allowlisted account can submit, and the mode is
blocked unless the Neon Function is connected to the exact staging database
host. Production does not enable it.
Invited staff sign in with the matching verified Google account and select
**Accept staff invitations** on `/pilot`. The reviewer page supports workspace
scoped reports, private photos, private notes, status changes, and replies.
Workspace administrators can manage invitations, staff roles, and private
report retention. Editorial workflows include redacted expert requests,
assigned assessments, moderator interpretation, and independent publication
review. Hidden updates expose only a withdrawal record in the public feed.
Voice is disabled in Neon mode until its transcription and moderation path is
ported and verified. Keep full real intake disabled until the human release
reviews and operational response arrangements are in place.

The Cloudflare staging pilot delegates staff operations, connected submission,
and receipt actions and uploads to the `whispersapi` Neon Function. The staging
Function is deployed to the staging branch with the exact preview URL as
`WHISPERS_APP_ORIGIN`; Neon Auth trusts that same origin. The Worker forwards
through server-only `WHISPERS_BACKEND_URL` and `WHISPERS_BACKEND_SECRET`
settings. The function still verifies the user's Neon Auth session and
workspace permissions. These settings apply to staging only; production
configuration remains untouched. The preview URL is public. Its restricted
partner-demo mode is active for one allowlisted account; do not use it for
identifying, sensitive, or urgent information. Other visitors cannot submit.

The latest hosted checks returned HTTP 200 for `/`, `/report`,
`/report/review`, `/help`, and `/pilot`, and the protected intake-status check
returned HTTP 200 with `mode=real` and `partnerDemo=true`. The signed-in
allowlisted account has reviewer workspace access; the workspace displayed no
reports. Citizen submission, assigned reviewer flows, and private-photo
authorization still need separate staging verification.

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
Verify that successful runs are monitored before any broader release.

The five fictional legacy reports and their three private photo copies were
deleted from both Neon staging and the original Lovable Supabase source at the
owner's direction. Verification found no reports or objects remaining in that
source database. Its database remains enabled and may still hold unrelated
accounts or configuration; do not disable it until the remaining dependencies
are reconciled. Do not re-import the deleted reports.
