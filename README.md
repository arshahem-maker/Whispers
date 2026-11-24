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
