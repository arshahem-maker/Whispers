import { createFileRoute } from "@tanstack/react-router";
import { authenticateCronRequest } from "@/integrations/supabase/cron-auth";
import { authenticateNeonRetention } from "@/lib/whispers/retention-auth.server";

export const Route = createFileRoute("/api/public/retention")({
  server: {
    handlers: {
      POST: async ({ request }) => {
        const neon = process.env["WHISPERS_PILOT_BACKEND"] === "neon";
        const denied = neon ? authenticateNeonRetention(request) : await authenticateCronRequest(request);
        if (denied) return denied;
        const headers = { "Cache-Control": "no-store" };
        try {
          const result = neon
            ? await (await import("@/lib/whispers/neon-retention.server")).runNeonRetention()
            : await (await import("@/lib/whispers/retention.server")).runRetention();
          return Response.json(result, { headers });
        } catch {
          return Response.json({ message: "Retention cleanup needs retrying." }, { status: 503, headers });
        }
      },
    },
  },
});
