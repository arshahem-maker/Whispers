import { pilotReceiptSchema, pilotSubmitSchema } from "./src/lib/whispers/pilot-schema";
import { parseTriggerDelivery } from "@neon/functions/triggers";
import { neonDatabase } from "./src/integrations/neon/database.server";
import { timingSafeEqual } from "node:crypto";
import { reviewerHandlers } from "./src/integrations/neon/reviewer-handlers.server";
import { runNeonRetention } from "./src/lib/whispers/neon-retention.server";

const headers = { "Cache-Control": "no-store" };

async function retention(source: "scheduled" | "manual") {
  let result: Awaited<ReturnType<typeof runNeonRetention>> | undefined;
  try {
    result = await runNeonRetention();
  } catch {
    console.error("Whispers retention cleanup failed", { source });
  }
  try {
    await neonDatabase()`
      insert into public.whispers_retention_status (
        id, last_finished_at, last_succeeded_at, last_expired_count
      )
      values (${source}, now(), case when ${Boolean(result)} then now() end, ${result?.expired ?? null})
      on conflict (id) do update set
        last_finished_at = excluded.last_finished_at,
        last_succeeded_at = coalesce(excluded.last_succeeded_at, whispers_retention_status.last_succeeded_at),
        last_expired_count = coalesce(excluded.last_expired_count, whispers_retention_status.last_expired_count)
    `;
  } catch {
    console.error("Whispers retention status could not be recorded", { source });
    return new Response(null, { status: 503, headers });
  }
  return result ? Response.json(result, { headers }) : new Response(null, { status: 503, headers });
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
      return retention("scheduled");
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
    if (source.pathname === "/retention" && request.method === "POST") return retention("manual");
    return new Response(null, { status: 404, headers });
  },
};
