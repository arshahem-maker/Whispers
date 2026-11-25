<!-- LOVABLE:BEGIN -->
> [!IMPORTANT]
> This project is connected to [Lovable](https://lovable.dev). Avoid rewriting
> published git history — force pushing, or rebasing/amending/squashing commits
> that are already pushed — as it rewrites history on Lovable's side and the
> user will likely lose their project history.
>
> Commits you push to the connected branch sync back to Lovable and show up in
> the editor, so keep the branch in a working state.

## External services and data

The current migration target is Neon. Lovable Cloud/Supabase is a legacy
integration and must not be treated as the active backend for Neon work.

- **Neon schema.** Checked-in SQL under `drizzle/neon/` is the Neon schema
  source. Review schema changes and migration ordering carefully. Never run
  migrations against `production` during routine development; use an isolated
  staging branch with synthetic data. Do not assume that a Neon branch is
  isolated until its branch name and connection are verified.
- **Legacy Supabase schema.** `supabase/` and `drizzle/proposed/` contain legacy
  Supabase work. Do not apply those migrations to Neon. Preserve legacy data
  until its export, import, counts, private files, identity mapping, and restore
  have been reconciled.
- **AI services.** Neon-mode features must not depend on Lovable's AI gateway.
  Use Neon AI Gateway or an explicitly approved provider, with server-only
  credentials and bounded usage. Keep secrets out of browser code and Git.
- **Lovable sync.** Never rewrite published history. A push to one Git branch
  does not prove it is Lovable's connected branch; verify the project's latest
  revision and branch before claiming sync.
- **Generated files.** Do not edit a file whose header says it is automatically
  generated.
- **Secrets.** Keep all credentials in the relevant service's secret store or
  ignored local environment files. Never put secret values in the repository.
<!-- LOVABLE:END -->

## Whispers architecture
- Demo data goes through `src/lib/whispers/store.ts`; connected fictional-pilot data goes through explicit server operations. Every operation authorises from trusted staff records, never UI state.
- Private codes are generated client-side (CSPRNG, 160 bits) and only their SHA-256 hash is stored; never put codes or report content in URLs, storage or logs.
- Citizen strings go through `t()`; other app-owned interface phrases use `tr()` with a bundled static allowlist. Translate only this allowlist server-side, never submitted reports, messages, private codes or form values; label machine output unreviewed and keep English available.
- Main citizen submission and follow-up may explicitly opt into fictional Cloud pilot operations; default demo remains local. Real-source intake stays disabled pending human review. Never serialise or trust a browser store snapshot as server authority.
- Atomic database transitions enforce photo quotas, report revocation and publication eligibility; retry private media deletion through a durable cleanup queue so storage failures cannot restore access.
- Voice reporting uses consent-gated complete WAV uploads; dedicated transcription precedes audio understanding, with uncertain sound observations kept separate and editable English prefill.
- Staff invitations grant only reviewer/expert access for their selected workspace after a verified-email match in an authenticated transactional function; sharing a generic sign-in link is not an access credential.
- Private pilot photo previews use authenticated Storage downloads under report/workspace RLS and temporary object URLs revoked on close/unmount; never issue shareable signed links for previews.
