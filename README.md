# Welcome to your Lovable project

This project was built with [Lovable](https://lovable.dev).

## Build with Lovable

Open your project in the [Lovable editor](https://lovable.dev) and keep building.

- **Ship faster**: describe what you want to build and Lovable handles the code.
- **Stay in sync**: connect the project to GitHub and every change made in Lovable is committed straight to your repository.
- **Full ownership**: this code is yours. Push to your repository and your changes sync back into Lovable, ready for your next prompt.

## Development

Prefer working locally? You need Node.js and npm — [install with nvm](https://github.com/nvm-sh/nvm#installing-and-updating).

```sh
git clone <this-repository-url>
cd <repository-name>
npm i
npm run dev
```

## Built with

- TanStack Start
- TypeScript
- React
- Tailwind CSS

## Connected fictional pilot

Use a staging database and synthetic reports. The browser-tab demo can run without Cloud credentials.

1. Run `npm run typecheck`, `npm run lint`, `npm test`, `npm run build`, and `bash scripts/test-pilot-db.sh`. The last command uses a disposable PostgreSQL container.
2. Confirm the staging database has migrations 0000–0005. Review and apply `drizzle/proposed/0006_pilot_release_blockers.sql` through Lovable's managed migration workflow before enabling this build's connected pilot. The proposed migration is deliberately outside the automatic migration journal.
3. Set the server-only `WHISPERS_PILOT_TESTER_IDS` to a comma-separated list of authorized test accounts' Supabase user IDs. An unset or empty list disables new connected submissions. Have testers sign in before drafting. Existing reports still use their private codes for follow-up.
4. Keep `WHISPERS_VOICE_ENABLED` and `VITE_WHISPERS_VOICE_ENABLED` unset for a text-first pilot. Enable both only after reviewing audio processing and confirming provider funding and recovery. Public language selection reads prepared translations. Have native speakers review safety-critical wording and validate the current catalog before offering a language in the pilot.
5. Use distinct tester, reviewer, expert, publisher and retention administrator accounts. Test report submission, retry, three attachments, repeat receipt opens, replies, expert assessment, publication and withdrawal, and removal under interrupted network and concurrent actions.
6. Verify the hosting scheduler calls the authenticated retention endpoint and alert on overdue cleanup jobs, failed runs and public feed outages. Rehearse restore in a disposable environment, including database and private storage. Record the responsible operator and escalation contact before any move toward real intake.

### Free hosted staging

The Render Blueprint targets one Free Node web service on the pilot branch. Use a separate Supabase Free project for PostgreSQL, Auth, and private storage. The browser and server Supabase URL and publishable key must point to that same staging project. Keep the service-role key server-only. The Blueprint generates separate secrets for intake throttling and the retention endpoint, so text intake can work without an AI gateway key.

In staging Supabase, create the private `whispers-private` bucket, apply the reviewed migrations, and configure Google OAuth with the hosted `/pilot` redirect. Use a scheduled GitHub Actions job or an existing scheduler for the authenticated retention endpoint after the staging host and secret are configured. Export the database and private storage separately for restore testing.

### Neon staging migration

Use `staging/neon` and fictional fixtures until hosted verification is complete.
After `neon deploy` pulls the environment, apply the reviewed PostgreSQL
migrations with `node --env-file=.env.local scripts/migrate-neon.mjs`. Use a
disposable database for `bash scripts/test-neon-db.sh`. Run
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

Legacy data is held in a restricted Neon snapshot. Transfer private files
with `node --env-file=.env.local scripts/copy-neon-legacy-photos.mjs <downloaded-files>`.
Run `node --env-file=.env.local scripts/import-neon-legacy.mjs` to check
photo completeness, staff identity, and record eligibility. Reconcile the final
source snapshot before running the same command with `--apply`. After activation,
verify report and attachment counts, replay the staff and receipt checks, and
rehearse restore with a disposable environment. Set an explicit access and
retention policy for the restricted snapshot and downloaded files after cutover.
