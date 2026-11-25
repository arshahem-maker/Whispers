import { beforeEach, describe, expect, it, vi } from "vitest";

const jose = vi.hoisted(() => ({
  createRemoteJWKSet: vi.fn(() => ({ jwks: true })),
  jwtVerify: vi.fn(),
}));

vi.mock("jose", () => jose);

describe("Neon Auth identity verification", () => {
  beforeEach(() => {
    vi.resetModules();
    jose.createRemoteJWKSet.mockClear();
    jose.jwtVerify.mockReset();
    vi.stubEnv("NEON_AUTH_BASE_URL", "https://auth.example.test/neondb/auth");
    vi.stubEnv("NEON_AUTH_JWKS_URL", "https://auth.example.test/neondb/auth/.well-known/jwks.json");
  });

  it("validates the managed issuer and required identity claims without assuming an audience", async () => {
    jose.jwtVerify.mockResolvedValue({ payload: { sub: "user-123" } });
    const { neonIdentity } = await import("./identity.server");

    await expect(neonIdentity(new Request("https://app.example.test", {
      headers: { authorization: "Bearer signed-token" },
    }))).resolves.toEqual({ issuer: "https://auth.example.test", subject: "user-123" });

    expect(jose.jwtVerify).toHaveBeenCalledWith(
      "signed-token",
      expect.anything(),
      { issuer: "https://auth.example.test", requiredClaims: ["sub", "exp"] },
    );
  });

  it("rejects missing bearer credentials", async () => {
    const { neonIdentity } = await import("./identity.server");
    await expect(neonIdentity(new Request("https://app.example.test"))).resolves.toBeNull();
    expect(jose.jwtVerify).not.toHaveBeenCalled();
  });
});
