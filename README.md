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

The `staging/neon` branch starts a provider-independent database migration. Run `bash scripts/test-neon-db.sh` against a disposable PostgreSQL instance to check the migration sequence and private-photo authorization. The shared transactions remain PostgreSQL. The Neon bootstrap supplies the role and identity contracts previously provided by Supabase, and the photo lookup checks the actor's active reviewer scope and the source report's current retention state.

The current web application still uses Supabase. Before switching a deployment, connect Neon Auth and map verified identities to stable application user IDs, set the actor only inside a server-controlled transaction, replace the existing application queries, and stream media from a private bucket through an authenticated application endpoint. Retest sign-in, invitations, report submission, storage cleanup, and restore before pointing any hosted staging traffic at Neon.

After `neon deploy` pulls the environment, apply the migrations with
`node --env-file=.env.local scripts/migrate-neon.mjs` (use `.env` if Neon wrote there).
Set the server-only `WHISPERS_PUBLIC_FEED_BACKEND=neon` to read public updates
from the Neon PostgreSQL projection. Keep the pooled `DATABASE_URL` server-only.
This setting affects the public feed. Connected intake, staff sign-in and
private media still use the existing Supabase application integrations.

The opt-in Neon citizen and reviewer routes use `WHISPERS_PILOT_BACKEND=neon`,
`VITE_WHISPERS_REVIEWER_BACKEND=neon`, and `VITE_NEON_AUTH_URL`. Use those together
during synthetic staging. Existing Lovable data is held in a restricted Neon
migration snapshot. Preserve original attachment keys when transferring the
Lovable Storage downloads with
`node --env-file=.env.local scripts/copy-neon-legacy-photos.mjs <downloaded-files>`.
Verify every photo and map the existing staff identity before activating the
copied records or switching hosted traffic.
