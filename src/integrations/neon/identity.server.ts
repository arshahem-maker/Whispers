import { createRemoteJWKSet, jwtVerify } from "jose";

let keys: ReturnType<typeof createRemoteJWKSet> | undefined;

export async function neonIdentity(request: Request) {
  const token = /^Bearer (\S+)$/.exec(request.headers.get("authorization") ?? "")?.[1];
  if (!token) return null;
  const authUrl = process.env["NEON_AUTH_BASE_URL"];
  const jwksUrl = process.env["NEON_AUTH_JWKS_URL"];
  if (!authUrl || !jwksUrl) throw new Error("Neon sign-in is unavailable.");
  const issuer = new URL(authUrl).origin;
  try {
    keys ??= createRemoteJWKSet(new URL(jwksUrl));
    // Neon Auth's Managed JWT contract validates the branch issuer and signature.
    // Do not pin `aud`: Neon-issued user tokens do not promise the branch URL as
    // their audience, so that extra check can reject an otherwise valid session.
    const { payload } = await jwtVerify(token, keys, { issuer, requiredClaims: ["sub", "exp"] });
    return payload.sub ? { issuer, subject: payload.sub } : null;
  } catch {
    return null;
  }
}
