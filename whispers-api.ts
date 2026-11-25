import { pilotReceiptSchema, pilotSubmitSchema } from "./src/lib/whispers/pilot-schema";
import { parseTriggerDelivery } from "@neon/functions/triggers";
import { timingSafeEqual } from "node:crypto";
import { reviewerHandlers } from "./src/integrations/neon/reviewer-handlers.server";
import { runNeonRetention } from "./src/lib/whispers/neon-retention.server";

const headers = { "Cache-Control": "no-store" };

async function retention() {
  try {
    return Response.json(await runNeonRetention(), { headers });
  } catch {
    return new Response(null, { status: 503, headers });
  }
}

export default {
  async fetch(request: Request) {
    const source = new URL(request.url);
    if (source.pathname === "/scheduled-retention" && request.method === "POST") {
      const parsed = await parseTriggerDelivery(request);
      if (
        !parsed.ok ||
        parsed.invocation.type !== "schedule" ||
        parsed.invocation.trigger.name !== "whispers-retention"
      ) {
        return new Response(null, { status: 401, headers });
      }
      return retention();
    }
    const secret = process.env["WHISPERS_BACKEND_SECRET"];
    const provided = Buffer.from(request.headers.get("X-Whispers-Backend") ?? "");
    const expected = Buffer.from(secret ?? "");
    if (!secret || provided.length !== expected.length || !timingSafeEqual(provided, expected)) {
      return new Response(null, { status: 401, headers });
    }
    if (
      source.pathname === "/reviewer" &&
      (request.method === "GET" || request.method === "POST")
    ) {
      const url = new URL(
        "/api/public/neon-reviewer" + source.search,
        process.env["WHISPERS_APP_ORIGIN"],
      );
      return reviewerHandlers[request.method]({ request: new Request(url, request) });
    }
    if (
      (source.pathname === "/receipt" || source.pathname === "/submit") &&
      request.method === "POST"
    ) {
      const input = await request.json().catch(() => null);
      const citizen = await import("./src/lib/whispers/neon-citizen.server");
      try {
        if (source.pathname === "/receipt") {
          const data = pilotReceiptSchema.safeParse(input);
          if (data.success)
            return Response.json(await citizen.receiptNeonPilot(data.data), { headers });
        } else {
          const data = pilotSubmitSchema.safeParse(input);
          if (data.success)
            return Response.json(await citizen.submitNeonPilot(data.data, request), { headers });
        }
        return new Response(null, { status: 400, headers });
      } catch {
        return new Response(null, { status: 409, headers });
      }
    }
    if (source.pathname === "/photo") {
      const { handleNeonPhoto } = await import("./src/integrations/neon/photo-upload.server");
      return handleNeonPhoto(request, process.env["WHISPERS_APP_ORIGIN"]);
    }
    if (source.pathname === "/retention" && request.method === "POST") return retention();
    return new Response(null, { status: 404, headers });
  },
};
