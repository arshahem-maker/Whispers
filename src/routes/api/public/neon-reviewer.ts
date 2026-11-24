import { createFileRoute } from "@tanstack/react-router";
import { z } from "zod";

export const Route = createFileRoute("/api/public/neon-reviewer")({
  server: {
    handlers: {
      GET: async ({ request }) => {
        const photo = new URL(request.url).searchParams.get("photo");
        if (photo !== null && !z.string().uuid().safeParse(photo).success) {
          return new Response(null, { status: 404, headers: { "Cache-Control": "no-store" } });
        }
        const { neonReviewer } = await import("@/integrations/neon/reviewer.server");
        return neonReviewer(request, photo ?? undefined);
      },
    },
  },
});
