import { z } from "zod";
import { editorialCommandSchema } from "@/lib/whispers/editorial";
import { neonInvitationCommandSchema } from "@/lib/whispers/staff-invitations";

const idSchema = z.string().uuid();
const commandSchema = z.union([
  z.object({ reportId: idSchema, reply: z.string().trim().min(1).max(2000) }).strict(),
  z.object({ reportId: idSchema, note: z.string().trim().min(1).max(2000) }).strict(),
  z
    .object({
      reportId: idSchema,
      state: z.enum(["in_review", "awaiting_contributor", "awaiting_expert", "complete"]),
    })
    .strict(),
  z.object({ acceptInvitations: z.literal(true) }).strict(),
  neonInvitationCommandSchema,
  editorialCommandSchema,
  z.object({ removalId: idSchema }).strict(),
  z
    .object({
      extensionId: idSchema,
      nextReview: z
        .string()
        .datetime()
        .refine((value) => {
          const delay = Date.parse(value) - Date.now();
          return delay > 0 && delay <= 30 * 86_400_000;
        }),
      reason: z.string().trim().min(1).max(2000),
    })
    .strict(),
]);

export const reviewerHandlers = {
  GET: async ({ request }: { request: Request }) => {
    const query = new URL(request.url).searchParams;
    const photoId = query.get("photo");
    const reportId = query.get("report");
    const invitations = query.has("invitations");
    const retention = query.has("retention");
    const editorial = query.has("editorial");
    if (
      [editorial, invitations, retention, photoId !== null, reportId !== null].filter(Boolean)
        .length > 1 ||
      [photoId, reportId].some((id) => id !== null && !idSchema.safeParse(id).success)
    ) {
      return new Response(null, { status: 404, headers: { "Cache-Control": "no-store" } });
    }
    const { neonReviewer } = await import("@/integrations/neon/reviewer.server");
    return neonReviewer(
      request,
      editorial
        ? { editorial }
        : retention
          ? { retention }
          : invitations
            ? { invitations }
            : photoId
              ? { photoId }
              : reportId
                ? { reportId }
                : undefined,
    );
  },
  POST: async ({ request }: { request: Request }) => {
    const headers = { "Cache-Control": "no-store" };
    if (request.headers.get("origin") !== new URL(request.url).origin) {
      return new Response(null, { status: 403, headers });
    }
    const reader = request.body?.getReader();
    if (!reader) return new Response(null, { status: 400, headers });
    const decoder = new TextDecoder();
    let size = 0;
    let json = "";
    try {
      for (;;) {
        const { done, value } = await reader.read();
        if (done) break;
        size += value.byteLength;
        if (size > 48_000) {
          await reader.cancel();
          return new Response(null, { status: 413, headers });
        }
        json += decoder.decode(value, { stream: true });
      }
      json += decoder.decode();
    } catch {
      return new Response(null, { status: 400, headers });
    } finally {
      reader.releaseLock();
    }
    let input: unknown;
    try {
      input = JSON.parse(json);
    } catch {
      return new Response(null, { status: 400, headers });
    }
    const body = commandSchema.safeParse(input);
    if (!body.success) return new Response(null, { status: 400, headers });
    const { neonReviewer } = await import("@/integrations/neon/reviewer.server");
    return neonReviewer(request, body.data);
  },
};
