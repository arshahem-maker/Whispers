# Whispers

Whispers is an owner-run humanitarian reporting and review demonstration. All
sample people, reports, reviewer roles, and outcomes are fictional. The
connected staging path accepts fictional test records only; real-information
intake is disabled. The account owner is the temporary demonstration operator.
This is not an emergency or response service.

## Current release status — 26 November 2026

- The original Neon implementation entered `main` through PR #2 on
  26 November 2026. Since then, the owner-demo route isolation and subsequent
  hardening have also been merged. At the latest repository sync, `main` and
  `staging/neon` matched their GitHub branches, the dependency batch in PR #11
  and the status-documentation update in PR #12 were merged, and GitHub Verify
  passed on the resulting `main`. This source sync does not itself deploy
  either branch. The production Neon project remains separate.
  A second Free-plan project, `Whispers Staging`,
  provides the app schema and Neon services. The restricted migration snapshot
  and its three private photo copies were deleted from staging at the owner's
  direction. No legacy report rows have been activated in app tables. The local
  `.neon` and `.env.local` still point to production; use the ignored
  `.env.staging.local` for staging-only work.
- The initial owner-run, fictional-only demo safeguards and presenter flow
  were merged by [PR #8](https://github.com/arshahem-maker/Whispers/pull/8)
  and later refined by PR #10. The separate owner-demo preview was last
  confirmed built from app revision `2d2976c`; repository updates do not
  automatically redeploy that preview.
- The Lovable project is not published, and its managed Supabase database is
  still enabled. All five source reports were explicitly marked fictional and
  have been deleted with their three private photo objects. Verification found
  zero report rows and zero objects in `whispers-private`; no report content was
  inspected. A read-only source comparison on 26 November found that its latest
  internal commit changed only a Lovable planning file, there were no pending
  drafts, and its file tree lacks many Neon/backend files present in this
  repository. GitHub is the current code source; this repository sync did not
  bring the Lovable editor or preview up to date. Do not disable the database
  until remaining app dependencies and configuration have been reconciled.
- Full real-source release and real-information partner intake are disabled.
  Connected staging accepts fictional test reports from the one verified,
  allowlisted account. The account owner is the temporary demo operator and
  can review these synthetic records during a demonstration. Public and local
  browser demos use in-memory fictional data. The full release gate still
  requires independent operational, privacy, safeguarding, language, and
  security work before any real-world use. Staging submissions remain
  authenticated and allowlisted; this is not anonymous public intake. The hosted
  `workers.dev` site is a
  public staging preview at
  <https://staging-neon-whispers-neon-pilot.whispers-by-arsh.workers.dev>.
  Cloudflare marks it `noindex`; anyone with the URL can visit it. The home,
  report, report-review, help, and `/pilot` routes return HTTP 200. Google
  sign-in and the allowlisted account's reviewer workspace have been verified.
  The owner-run demo preview is separately built without Neon bindings or
  secrets at
  <https://owner-demo-whispers-neon-pilot.whispers-by-arsh.workers.dev>. Its
  report form cannot switch to connected submission; reports stay in browser
  memory and reset on refresh. It was tested through fictional report save,
  role simulation, review assignment, and an internal note that states no
  evidence review occurred.
- A **For organizations** page supports partner-evaluation conversations. It
  uses a mail link rather than a form and asks people not to email sensitive
  case details. Organizations still cannot submit reports through staging.
- The project owner is the temporary operator for demonstrations. The legal
  operator and legal form for a future operational service have not been
  confirmed, so the app does not claim a registered company or present its FAQ
  as a complete legal privacy notice.
- The maintained staging Worker adds baseline browser security headers, does
  not cache HTML, marks `workers.dev` responses `noindex`, and applies a fresh
  response nonce to every script and style tag. Its `script-src` policy does
  not allow inline scripts. Inline style allowances still need a separate
  production review.
- Cloudflare also has a separate, older **production** Worker deployment at
  <https://whispers-neon-pilot.whispers-by-arsh.workers.dev>. It is publicly
  reachable, still presents the fictional demo, and has no `/partners` page
  (that route returns 404). On 26 November 2026, the root, report, help, and
  `/pilot` routes returned HTTP 200; the unauthenticated Neon reviewer API
  returned 401. The checked HTML responses had no CSP, `X-Robots-Tag`, or
  `Cache-Control` header. This is not the current staging build and must not be
  treated as the production launch. The current repo has no reviewed production
  release configuration or deployment workflow; do not point real reporters
  to this Worker.
- The Neon browser entry is 331 kB raw / 103 kB gzip. The legacy Supabase Auth
  client and pilot UI load separately; the public home and Neon `/pilot` do not
  preload the Supabase client. This is a bundle optimization, not a removal of
  the legacy integration or proof of a complete Neon-only migration.
- Neon Function submission and receipt bodies are capped at 64 KiB before JSON
  parsing. The migration runner now stores SHA-256 checksums and rejects future
  edits to recorded migration files. Existing staging migration records have
  been pinned to checksums; this records the current file contents and cannot
  independently prove what historical contents were first applied.
- The dependency lock includes the merged Dependabot updates through PR #11.
  GitHub Verify's Bun audit found no known vulnerabilities on that revision.
  Weekly Dependabot updates for Bun and GitHub Actions are configured.

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
full real intake in that panel. The staging partner-demo real-intake flag is
disabled. Only fictional test reports are accepted from the one allowlisted
account; keep demo role simulations and reports marked fictional. Production
does not enable intake.
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
configuration remains untouched. The preview URL is public. Its connected
staging workspace accepts fictional test records only from one allowlisted
account. Other visitors cannot submit.

Connected staging route checks returned HTTP 200 for `/`, `/report`,
`/report/review`, `/help`, and `/pilot`. Its protected intake status reports
fictional mode and `partnerDemo=false`; a connected staging submission-to-
removal flow has not been proven. The separate owner-run preview passed a
fictional report-to-review workflow in one browser tab; that in-memory result
does not prove connected staging behavior. See `TESTING-RESULTS.md`.

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
