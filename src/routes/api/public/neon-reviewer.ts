import { createFileRoute } from "@tanstack/react-router";

async function handle(request: Request, method: "GET" | "POST") {
  if (process.env["WHISPERS_PILOT_BACKEND"] !== "neon") {
    return new Response(null, { status: 404, headers: { "Cache-Control": "no-store" } });
  }
  const { reviewerHandlers } = await import("@/integrations/neon/reviewer-handlers.server");
  return reviewerHandlers[method]({ request });
}

export const Route = createFileRoute("/api/public/neon-reviewer")({
  server: {
    handlers: {
      GET: ({ request }) => handle(request, "GET"),
      POST: ({ request }) => handle(request, "POST"),
    },
  },
});
