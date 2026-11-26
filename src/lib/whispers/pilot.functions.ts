import { createMiddleware, createServerFn } from "@tanstack/react-start";
import { connectedSubmitSchema, pilotReceiptSchema } from "./pilot-schema";

const attachNeonSession = createMiddleware({ type: "function" }).client(async ({ next }) => {
  const { neonAuthClient } = await import("@/integrations/neon/auth-client");
  const { data } = await (await neonAuthClient()).getSession();
  if (!data.session?.access_token) throw new Error("Sign in as an invited tester.");
  return next({ headers: { Authorization: `Bearer ${data.session.access_token}` } });
});

export const submitNeonPilotReport = createServerFn({ method: "POST" })
  .middleware([attachNeonSession])
  .validator((input) => connectedSubmitSchema.parse(input))
  .handler(async ({ data }) => {
    const { getRequest, setResponseHeader } = await import("@tanstack/react-start/server");
    setResponseHeader("Cache-Control", "no-store");
    if (process.env["WHISPERS_PILOT_BACKEND"] !== "neon") throw new Error("Neon reporting is unavailable.");
    const { callWhispersBackend } = await import("./backend-forward.server");
    const forwarded = callWhispersBackend("/submit", data, getRequest().headers.get("Authorization"));
    if (forwarded) return (await forwarded) as { accepted: true };
    const { submitNeonPilot } = await import("./neon-citizen.server");
    return submitNeonPilot(data, getRequest());
  });

export const pilotIntakeMode = createServerFn({ method: "POST" }).handler(async () => {
  if (process.env["WHISPERS_PILOT_BACKEND"] !== "neon") return { mode: "fictional" as const, partnerDemo: false };
  const { callWhispersBackend } = await import("./backend-forward.server");
  const forwarded = callWhispersBackend("/intake-status", {});
  if (forwarded) return (await forwarded) as { mode: "fictional" | "real"; partnerDemo: boolean };
  const { currentNeonIntakeStatus } = await import("@/integrations/neon/live-intake.server");
  return currentNeonIntakeStatus();
});

export const pilotReceipt = createServerFn({ method: "POST" })
  .validator((input) => pilotReceiptSchema.parse(input))
  .handler(async ({ data }) => {
    const { setResponseHeader } = await import("@tanstack/react-start/server");
    setResponseHeader("Cache-Control", "no-store");
    if (process.env["WHISPERS_PILOT_BACKEND"] !== "neon") return null;
    const { callWhispersBackend } = await import("./backend-forward.server");
    const forwarded = callWhispersBackend("/receipt", data);
    if (forwarded) {
      return (await forwarded) as Awaited<ReturnType<typeof import("./neon-citizen.server").receiptNeonPilot>>;
    }
    return (await import("./neon-citizen.server")).receiptNeonPilot(data);
  });

export const pilotPublicUpdates = createServerFn({ method: "GET" }).handler(async () => {
  const { setResponseHeader } = await import("@tanstack/react-start/server");
  setResponseHeader("Cache-Control", "no-store");
  if (process.env["WHISPERS_PILOT_BACKEND"] !== "neon"
      && process.env["WHISPERS_PUBLIC_FEED_BACKEND"] !== "neon") return [];
  const rows = await (await import("./neon-public-updates.server")).readNeonPublicUpdates();
  return rows.map((u) => {
    const demo = typeof u.fictional === "boolean" ? u.fictional : true;
    return {
      id: String(u.id), title: String(u.title ?? ""), summary: String(u.summary ?? ""),
      known: String(u.known ?? ""), uncertain: String(u.uncertain ?? ""),
      sources: Array.isArray(u.sources) ? u.sources.filter((s): s is string => typeof s === "string") : [],
      publishedAt: String(u.published_at), withdrawn: Boolean(u.withdrawn), demo,
      broadContext: demo ? "Fictional connected pilot" : "Reviewed report", corrections: [],
    };
  });
});
