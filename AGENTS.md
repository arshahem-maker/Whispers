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

- **Neon schema.** `drizzle/neon/` contains Neon-specific migrations. The ordered
  runner also applies the shared baseline SQL in `drizzle/migrations/0000`–`0005`;
  use `scripts/migrate-neon.mjs` rather than applying any migration manually.
  Never run migrations against `production` during routine development; verify
  the isolated staging project and branch first.
- **Legacy services.** Lovable Cloud/Supabase still holds the old source data and
  some compatibility code. Keep production and staging app paths on Neon. Do
  not disable the legacy service or activate imported report rows until source
  content, counts, private files, verified identity mapping, and restore have
  been reconciled by a responsible operator.
- **AI services.** Neon-mode features must not depend on Lovable's AI gateway.
  Translation preparation and voice remain unavailable on Neon until their
  Neon-compatible paths, review requirements, and bounded cost controls are
  implemented. Keep all credentials server-only and out of Git.
- **Lovable sync.** Never rewrite published history. A push to one Git branch
  does not prove it is Lovable's connected branch; verify the project's latest
  revision and branch before claiming sync.
- **Generated files.** Do not edit a file whose header says it is automatically
  generated.
- **Secrets.** Keep all credentials in the relevant service's secret store or
  ignored local environment files. Never put secret values in the repository.
<!-- LOVABLE:END -->

## Whispers architecture
- Demo data goes through `src/lib/whispers/store.ts`; connected fictional-pilot data goes through the Neon server operations in `src/lib/whispers/neon-citizen.server.ts` and `src/integrations/neon/`. Every operation authorises from verified Neon Auth identity and trusted staff records, never UI state.
- Private codes are generated client-side (CSPRNG, 160 bits) and only their SHA-256 hash is stored; never put codes or report content in URLs, storage or logs.
- Citizen strings go through `t()`; other app-owned interface phrases use `tr()` with a bundled static allowlist. Translate only this allowlist server-side, never submitted reports, messages, private codes or form values; label machine output unreviewed and keep English available.
- Main citizen submission may use the local fictional demo or the separately gated connected path. Staging currently permits a narrow real-information partner demonstration for exactly one allowlisted account; it is private, unmonitored, and not a response service. Full release intake remains disabled pending human review. Never serialise or trust a browser store snapshot as server authority.
- Atomic database transitions enforce photo quotas, report revocation and publication eligibility; retry private media deletion through a durable cleanup queue so storage failures cannot restore access.
- Voice reporting remains disabled in Neon mode. Do not imply it works on the active deployment until its consent-gated upload, transcription, and moderation path has been ported, bounded, and verified.
- Staff invitations grant only reviewer/expert access for their selected workspace after a verified-email match in an authenticated transactional function; sharing a generic sign-in link is not an access credential.
- Private pilot photo reads use Neon Auth bearer tokens and a server-side workspace/report permission check before fetching from private Neon Object Storage. Revoke temporary object URLs on close/unmount; never issue shareable photo URLs.
