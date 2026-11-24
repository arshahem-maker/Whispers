import { createFileRoute } from "@tanstack/react-router";
import { z } from "zod";

const idSchema = z.string().uuid();
const replySchema = z.object({ reportId: idSchema, reply: z.string().trim().min(1).max(2000) }).strict();

export const Route = createFileRoute("/api/public/neon-reviewer")({
  server: {
    handlers: {
      GET: async ({ request }) => {
        const query = new URL(request.url).searchParams;
        const photoId = query.get("photo");
        const reportId = query.get("report");
        if ((photoId && reportId) || [photoId, reportId].some(id => id !== null && !idSchema.safeParse(id).success)) {
          return new Response(null, { status: 404, headers: { "Cache-Control": "no-store" } });
        }
        const { neonReviewer } = await import("@/integrations/neon/reviewer.server");
        return neonReviewer(request, photoId ? { photoId } : reportId ? { reportId } : undefined);
      },
      POST: async ({ request }) => {
        const headers = { "Cache-Control": "no-store" };
        if (request.headers.get("origin") !== new URL(request.url).origin) {
          return new Response(null, { status: 403, headers });
        }
        const body = replySchema.safeParse(await request.json().catch(() => null));
        if (!body.success) return new Response(null, { status: 400, headers });
        const { neonReviewer } = await import("@/integrations/neon/reviewer.server");
        return neonReviewer(request, body.data);
      },
    },
  },
});
