import { createAuthClient } from "@neon/auth";
import { SupabaseAuthAdapter } from "@neon/auth/vanilla";

const makeClient = (url: string) => createAuthClient(url, { adapter: SupabaseAuthAdapter() });
let client: ReturnType<typeof makeClient> | undefined;

export function neonAuthClient() {
  const url = import.meta.env["VITE_NEON_AUTH_URL"];
  if (!url) throw new Error("Neon sign-in is unavailable.");
  return (client ??= makeClient(url));
}
