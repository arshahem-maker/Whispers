import { createFileRoute } from "@tanstack/react-router";

export const Route = createFileRoute("/api/public/voice-challenge")({
  server: { handlers: { POST: async () => Response.json(
    { message: "Voice reporting is currently unavailable. You can type your report." },
    { status: 503, headers: { "Cache-Control": "no-store" } },
  ) } },
});
