import { createFileRoute } from "@tanstack/react-router";
import { authenticateNeonRetention } from "@/lib/whispers/retention-auth.server";

export const Route = createFileRoute("/api/public/retention")({
  server: {
    handlers: {
      POST: async ({ request }) => {
        if (process.env["WHISPERS_PILOT_BACKEND"] !== "neon") {
          return Response.json({ message: "Retention cleanup is unavailable." }, { status: 404, headers: { "Cache-Control": "no-store" } });
        }
        const denied = authenticateNeonRetention(request);
        if (denied) return denied;
        const headers = { "Cache-Control": "no-store" };
        try {
          const result = await (await import("@/lib/whispers/neon-retention.server")).runNeonRetention();
          return Response.json(result, { headers });
        } catch {
          return Response.json({ message: "Retention cleanup needs retrying." }, { status: 503, headers });
        }
      },
    },
  },
});
