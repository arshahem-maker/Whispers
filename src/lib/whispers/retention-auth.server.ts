import { createHash, timingSafeEqual } from "node:crypto";

export function authenticateNeonRetention(request: Request): Response | null {
  const headers = { "Cache-Control": "no-store" };
  const secret = process.env["WHISPERS_RETENTION_SECRET"];
  if (!secret) return new Response(null, { status: 503, headers });

  const token = /^Bearer ([^\s,]+)$/.exec(request.headers.get("authorization") ?? "")?.[1];
  if (!token) return new Response(null, { status: 401, headers });

  const digest = (value: string) => createHash("sha256").update(value).digest();
  const received = digest(token);
  const current = timingSafeEqual(received, digest(secret));
  const previous = timingSafeEqual(received, digest(process.env["WHISPERS_RETENTION_SECRET_PREVIOUS"] || secret));
  return current || previous ? null : new Response(null, { status: 401, headers });
}
