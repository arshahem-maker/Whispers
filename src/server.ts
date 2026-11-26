import "./lib/error-capture";

import { consumeLastCapturedError } from "./lib/error-capture";
import { renderErrorPage } from "./lib/error-page";

type ServerEntry = {
  fetch: (request: Request, env: unknown, ctx: unknown) => Promise<Response> | Response;
};

type HtmlRewriteElement = {
  setAttribute: (name: string, value: string) => void;
  prepend: (content: string, options: { html: true }) => void;
};
type HtmlRewriterInstance = {
  on: (selector: string, handlers: { element: (element: HtmlRewriteElement) => void }) => HtmlRewriterInstance;
  transform: (response: Response) => Response;
};
type HtmlRewriterConstructor = new () => HtmlRewriterInstance;

let serverEntryPromise: Promise<ServerEntry> | undefined;

function withSecurityHeaders(request: Request, response: Response): Response {
  const headers = new Headers(response.headers);
  const isHtml = (headers.get("content-type") ?? "").includes("text/html");
  // Workers can add a fresh nonce to the streamed SSR HTML without buffering it.
  // Local Node previews do not expose HTMLRewriter, so keep their dev-only CSP usable.
  const HtmlRewriter = (globalThis as typeof globalThis & { HTMLRewriter?: HtmlRewriterConstructor }).HTMLRewriter;
  const nonce = isHtml && response.body && HtmlRewriter
    ? crypto.randomUUID().replaceAll("-", "")
    : undefined;
  headers.set("X-Content-Type-Options", "nosniff");
  headers.set("X-Frame-Options", "DENY");
  headers.set("Referrer-Policy", "no-referrer");
  headers.set("Permissions-Policy", "camera=(), geolocation=(), microphone=(self), payment=()");
  // Keep browser execution and network access on the app's own origin and the
  // two configured Neon Auth origins. On Cloudflare Workers every SSR script and
  // style tag receives a fresh per-response nonce through HTMLRewriter.
  headers.set("Content-Security-Policy", [
    "default-src 'self'",
    "base-uri 'self'",
    "object-src 'none'",
    "frame-ancestors 'none'",
    "form-action 'self'",
    `script-src 'self' ${nonce ? `'nonce-${nonce}'` : "'unsafe-inline'"}`,
    `style-src 'self' 'unsafe-inline'${nonce ? ` 'nonce-${nonce}'` : ""}`,
    "img-src 'self' data: blob:",
    "font-src 'self' data:",
    "media-src 'self' blob:",
    "worker-src 'self' blob:",
    "connect-src 'self' https://ep-blue-thunder-bgfcd7v8.neonauth.c-9.eu-central-1.aws.neon.tech https://ep-rapid-union-bgsrx39c.neonauth.c-9.eu-central-1.aws.neon.tech",
  ].join("; "));
  if (new URL(request.url).protocol === "https:") {
    headers.set("Strict-Transport-Security", "max-age=31536000");
  }
  if (new URL(request.url).hostname.endsWith(".workers.dev")) {
    headers.set("X-Robots-Tag", "noindex, nofollow");
  }
  if (isHtml) {
    headers.set("Cache-Control", "no-store");
  }
  let secured = new Response(response.status === 204 || response.status === 304 ? null : response.body, {
    status: response.status,
    statusText: response.statusText,
    headers,
  });
  if (nonce) {
    // Rewriting changes the entity, so discard validators/length from the original.
    secured.headers.delete("Content-Length");
    secured.headers.delete("ETag");
    secured = new (HtmlRewriter as HtmlRewriterConstructor)()
      .on("script", { element: (element) => element.setAttribute("nonce", nonce) })
      .on("style", { element: (element) => element.setAttribute("nonce", nonce) })
      .on("head", {
        element: (element) => element.prepend(
          `<meta property="csp-nonce" content="${nonce}">`,
          { html: true },
        ),
      })
      .transform(secured);
  }
  return secured;
}

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
        return withSecurityHeaders(request, new Response(null, { status: 403, headers }));
      }
      url.protocol = "https:";
      return withSecurityHeaders(request, new Response(null, { status: 308, headers: { ...headers, Location: url.href } }));
    }
    try {
      const backend = process.env["WHISPERS_BACKEND_URL"];
      const secret = process.env["WHISPERS_BACKEND_SECRET"];
      const photo = url.pathname === "/api/public/neon-photo";
      const reviewer = url.pathname === "/api/public/neon-reviewer";
      if ((backend && secret && reviewer) || photo) {
        if (photo && (!backend || !secret)) {
          if (process.env["WHISPERS_PILOT_BACKEND"] !== "neon") return withSecurityHeaders(request, new Response(null, { status: 404 }));
          const { handleNeonPhoto } = await import("./integrations/neon/photo-upload.server");
          return withSecurityHeaders(request, await handleNeonPhoto(request, url.origin));
        }
        if (photo && request.method !== "POST") return withSecurityHeaders(request, new Response(null, { status: 405 }));
        if (request.method !== "GET" && request.method !== "POST") return withSecurityHeaders(request, new Response(null, { status: 405 }));
        const headers = new Headers();
        for (const key of ["Authorization", "Origin", "Content-Type"]) {
          const value = request.headers.get(key);
          if (value) headers.set(key, value);
        }
        if (secret) headers.set("X-Whispers-Backend", secret);
        if (reviewer && !headers.has("Authorization")) return withSecurityHeaders(request, new Response(null, { status: 401, headers: { "Cache-Control": "no-store" } }));
        const upstream = await fetch(new URL(photo ? "/photo" : "/reviewer" + url.search, backend), {
          method: request.method, headers, body: request.body,
          redirect: "manual", signal: AbortSignal.timeout(15_000),
        });
        if (upstream.status >= 300 && upstream.status < 400) {
          return withSecurityHeaders(request, new Response(null, { status: 502, headers: { "Cache-Control": "no-store" } }));
        }
        return withSecurityHeaders(request, upstream);
      }
      const handler = await getServerEntry();
      const response = await handler.fetch(request, env, ctx);
      return withSecurityHeaders(request, await normalizeCatastrophicSsrResponse(response));
    } catch (error) {
      console.error(error);
      return withSecurityHeaders(request, new Response(renderErrorPage(), {
        status: 500,
        headers: { "content-type": "text/html; charset=utf-8" },
      }));
    }
  },
};
