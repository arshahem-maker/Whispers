# Whispers release roadmap

Status checked 25 November 2026. This roadmap supersedes the earlier mixed
Supabase/Lovable checklist. Historical test results remain in
`TESTING-RESULTS.md` and are not proof of the current Neon build.

## Confirmed

- `staging/neon` is pushed to GitHub; `main` does not yet include it.
- Neon project `Whispers` and its `whispersapi` and `hello` Functions are
  provisioned. The scheduled retention trigger is enabled.
- The hosted `workers.dev` home and `/pilot` respond, but full sign-in and
  report workflows have not been verified on the current deployment.
- The Lovable project is unpublished and its managed Supabase database remains
  enabled. Supabase must not be disabled until a verified data cutover.
- Real-source intake is not approved or enabled.

## Next work, in order

1. **Isolate staging.** Create a persistent Neon staging environment from a
   schema-only or synthetic baseline. The Neon project currently has only its
   `production` branch, and the local checkout points to production. Do not
   duplicate production data until its contents are confirmed safe to copy.
   Check that the staging branch does not inherit a short TTL.
2. **Finish staff sign-in setup.** Configure a Whispers-owned Google Web OAuth
   client, the branch-specific Neon callback and trusted application origin.
   Add test accounts and verify invitations, role scoping, and workspace access.
3. **Choose and sync the release source.** Verify which Git branch Lovable
   tracks. Open a review PR for `staging/neon` to `main`; the existing draft PR
   targets the older `pilot/launch-hardening` branch. Require fresh CI results
   before merging.
4. **Complete and prove the Neon-only path.** Verify Worker environment flags
   and Function configuration. Port translation preparation to Neon Auth,
   Neon Postgres, and an approved AI provider, or keep it unavailable. Keep
   voice disabled until its Neon path and cost controls are implemented and
   reviewed. Identify and remove runtime Supabase dependencies only after each
   route has a tested Neon replacement.
5. **Reconcile legacy data.** Inventory the Lovable/Supabase tables, users, and
   private files; export and import only data that must be retained. Compare
   record and attachment counts, verify staff identity mapping, and rehearse a
   restore. The repository's import procedure exists, but this audit did not
   verify a snapshot or imported-data reconciliation.
6. **Run current staging verification.** With fictional fixtures and separate
   citizen, reviewer, expert, publisher, and administrator accounts, verify
   submissions, private-code follow-up, photo retry/viewing, removal, retention,
   invitations, editorial review, publication withdrawal, scheduled cleanup,
   and restore. Update `TESTING-RESULTS.md` with exact revision and results.
7. **Complete human release gates.** Obtain named native-language, security,
   legal/privacy, safeguarding, and operational reviews; confirm the operator,
   incident escalation, retention policy, and monitoring. Keep real intake
   disabled until these reviews and the technical checks are complete.

## Current blockers

- The Neon Auth provider is still Google's shared development credential; no
  Whispers OAuth client is configured.
- Lovable still reports Supabase enabled. Translation preparation and voice
  still depend on Lovable/Supabase code paths; neither is Neon-complete.
- GitHub has no PR for `staging/neon`; the open draft PR still targets the
  older `pilot/launch-hardening` branch.
- Current Neon end-to-end tests, production data migration, private-media
  restore, and human release reviews are not verified.
