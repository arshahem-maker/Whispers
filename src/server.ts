import "./lib/error-capture";

import { consumeLastCapturedError } from "./lib/error-capture";
import { renderErrorPage } from "./lib/error-page";

type ServerEntry = {
  fetch: (request: Request, env: unknown, ctx: unknown) => Promise<Response> | Response;
};

let serverEntryPromise: Promise<ServerEntry> | undefined;

async function getServerEntry(): Promise<ServerEntry> {
  if (!serverEntryPromise) {
    serverEntryPromise = import("@tanstack/react-start/server-entry").then(
      (m) => (m.default ?? m) as ServerEntry,
    );
  }
  return serverEntryPromise;
}

// h3 swallows in-handler throws into a normal 500 Response with body
// {"unhandled":true,"message":"HTTPError"} — try/catch alone never fires for those.
async function normalizeCatastrophicSsrResponse(response: Response): Promise<Response> {
  if (response.status < 500) return response;
  const contentType = response.headers.get("content-type") ?? "";
  if (!contentType.includes("application/json")) return response;

  const body = await response.clone().text();
  if (!isH3SwallowedErrorBody(body)) return response;

  console.error(consumeLastCapturedError() ?? new Error(`h3 swallowed SSR error: ${body}`));
  return new Response(renderErrorPage(), {
    status: 500,
    headers: { "content-type": "text/html; charset=utf-8" },
  });
}

function isH3SwallowedErrorBody(body: string): boolean {
  try {
    const payload = JSON.parse(body) as { unhandled?: unknown; message?: unknown };
    return payload.unhandled === true && payload.message === "HTTPError";
  } catch {
    return false;
  }
}

// Hosting compresses every response at the edge. Never compress a body (gzip, brotli,
// CompressionStream) or set content-encoding here or in a server route: the body gets encoded
// twice and renders garbled.
export default {
  async fetch(request: Request, env: unknown, ctx: unknown) {
    const url = new URL(request.url);
    if (url.protocol === "http:" && url.hostname.endsWith(".workers.dev")) {
      const headers = { "Cache-Control": "no-store" };
      if (request.method !== "GET" && request.method !== "HEAD") {
        return new Response(null, { status: 403, headers });
      }
      url.protocol = "https:";
      return new Response(null, { status: 308, headers: { ...headers, Location: url.href } });
    }
    try {
      const backend = process.env["WHISPERS_BACKEND_URL"];
      const secret = process.env["WHISPERS_BACKEND_SECRET"];
      const photo = url.pathname === "/api/public/neon-photo";
      const reviewer = url.pathname === "/api/public/neon-reviewer";
      if ((backend && secret && reviewer) || photo) {
        if (photo && (!backend || !secret)) {
          if (process.env["WHISPERS_PILOT_BACKEND"] !== "neon") return new Response(null, { status: 404 });
          const { handleNeonPhoto } = await import("./integrations/neon/photo-upload.server");
          return handleNeonPhoto(request, url.origin);
        }
        if (photo && request.method !== "POST") return new Response(null, { status: 405 });
        if (request.method !== "GET" && request.method !== "POST") return new Response(null, { status: 405 });
        const headers = new Headers();
        for (const key of ["Authorization", "Origin", "Content-Type"]) {
          const value = request.headers.get(key);
          if (value) headers.set(key, value);
        }
        if (secret) headers.set("X-Whispers-Backend", secret);
        if (reviewer && !headers.has("Authorization")) return new Response(null, { status: 401, headers: { "Cache-Control": "no-store" } });
        const upstream = await fetch(new URL(photo ? "/photo" : "/reviewer" + url.search, backend), {
          method: request.method, headers, body: request.body,
          redirect: "manual", signal: AbortSignal.timeout(15_000),
        });
        if (upstream.status >= 300 && upstream.status < 400) {
          return new Response(null, { status: 502, headers: { "Cache-Control": "no-store" } });
        }
        return upstream;
      }
      const handler = await getServerEntry();
      const response = await handler.fetch(request, env, ctx);
      return await normalizeCatastrophicSsrResponse(response);
    } catch (error) {
      console.error(error);
      return new Response(renderErrorPage(), {
        status: 500,
        headers: { "content-type": "text/html; charset=utf-8" },
      });
    }
  },
};
