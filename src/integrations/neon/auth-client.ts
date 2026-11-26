import { createClientOnlyFn } from "@tanstack/react-start";

async function makeClient(url: string) {
  const [{ createAuthClient }, { SupabaseAuthAdapter }] = await Promise.all([
    import("@neon/auth"),
    import("@neon/auth/vanilla"),
  ]);
  return createAuthClient(url, { adapter: SupabaseAuthAdapter() });
}

let client: ReturnType<typeof makeClient> | undefined;

export const neonAuthClient = createClientOnlyFn(() => {
  const url = import.meta.env["VITE_NEON_AUTH_URL"];
  if (!url) throw new Error("Neon sign-in is unavailable.");
  return (client ??= makeClient(url).catch(error => {
    client = undefined;
    throw error;
  }));
});
