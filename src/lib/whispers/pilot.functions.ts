import { createMiddleware, createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { z } from "zod";
import { pilotSubmitSchema, connectedSubmitSchema, pilotCommandSchema, pilotReceiptSchema } from "./pilot-schema";

export const submitPilotReport = createServerFn({ method: "POST" }).middleware([requireSupabaseAuth]).validator((input) => pilotSubmitSchema.parse(input)).handler(async ({ data, context }) => {
  if (process.env["WHISPERS_PILOT_BACKEND"] === "neon") throw new Error("Use the Neon sign-in to submit a report.");
  const { submitPilot } = await import("./pilot.server");
  const { getRequest, setResponseHeader } = await import("@tanstack/react-start/server");
  setResponseHeader("Cache-Control", "no-store");
  const testerIds = (process.env["WHISPERS_PILOT_TESTER_IDS"] ?? "").split(",").map((id) => id.trim());
  if (!testerIds.includes(context.userId)) throw new Error("Connected intake is available to invited pilot testers only.");
  return submitPilot(data, getRequest());
});
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
  if (process.env["WHISPERS_PILOT_BACKEND"] !== "neon") return { mode: "fictional" as const };
  const { callWhispersBackend } = await import("./backend-forward.server");
  const forwarded = callWhispersBackend("/intake-status", {});
  if (forwarded) return (await forwarded) as { mode: "fictional" | "real" };
  const { currentNeonIntakeMode } = await import("@/integrations/neon/live-intake.server");
  return { mode: await currentNeonIntakeMode() };
});
export const pilotReceipt = createServerFn({ method: "POST" }).validator((input) => pilotReceiptSchema.parse(input)).handler(async ({ data }) => {
  const { setResponseHeader } = await import("@tanstack/react-start/server"); setResponseHeader("Cache-Control", "no-store");
  if (process.env["WHISPERS_PILOT_BACKEND"] === "neon") {
    const { callWhispersBackend } = await import("./backend-forward.server");
    const forwarded = callWhispersBackend("/receipt", data);
    if (forwarded) {
      return (await forwarded) as Awaited<ReturnType<typeof import("./neon-citizen.server").receiptNeonPilot>>;
    }
    return (await import("./neon-citizen.server")).receiptNeonPilot(data);
  }
  const { receiptPilot } = await import("./pilot.server"); return receiptPilot(data);
});
export const pilotStaff = createServerFn({ method: "POST" }).middleware([requireSupabaseAuth]).validator((value) => z.number().int().min(0).max(1000).parse(value)).handler(async ({ context, data }) => {
  const { setResponseHeader } = await import("@tanstack/react-start/server"); setResponseHeader("Cache-Control", "no-store");
  const { readPilot } = await import("./pilot.server"); return readPilot(context.supabase, context.userId, data);
});
export const pilotReportDetail = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .validator((value) => z.string().uuid().parse(value))
  .handler(async ({ context, data }) => {
    const { setResponseHeader } = await import("@tanstack/react-start/server");
    setResponseHeader("Cache-Control", "no-store");
    const { readPilotReport } = await import("./pilot.server");
    return readPilotReport(context.supabase, context.userId, data);
  });

export const pilotAssessments = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .validator((value) => z.string().uuid().parse(value))
  .handler(async ({ context, data }) => {
    const { setResponseHeader } = await import("@tanstack/react-start/server");
    setResponseHeader("Cache-Control", "no-store");
    const { readPilotAssessments } = await import("./pilot.server");
    return readPilotAssessments(context.supabase, context.userId, data);
  });

export const pilotRetentionQueue = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { setResponseHeader } = await import("@tanstack/react-start/server");
    setResponseHeader("Cache-Control", "no-store");
    const { data: memberships, error } = await context.supabase.from("user_roles")
      .select("contexts").eq("user_id", context.userId).eq("role", "admin").eq("active", true);
    if (error) throw new Error("Retention queue unavailable.");
    const scopes = [...new Set((memberships ?? []).flatMap((membership) => membership.contexts))];
    if (!scopes.length) return [];
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const result = await supabaseAdmin.from("whispers_reports")
      .select("id,workspace,expires_at,removal_requested_at").in("workspace", scopes)
      .is("revoked_at", null).gt("expires_at", new Date().toISOString())
      .order("removal_requested_at", { ascending: true, nullsFirst: false })
      .order("expires_at").limit(100);
    if (result.error) throw new Error("Retention queue unavailable.");
    return result.data ?? [];
  });

export const acceptStaffInvitations = createServerFn({ method: "POST" }).middleware([requireSupabaseAuth]).handler(async ({ context }) => {
  const result = await context.supabase.rpc("whispers_accept_staff_invitations");
  if(result.error) throw new Error("A verified invited account is required.");
  return { accepted: result.data };
});
export const pilotPublicUpdates = createServerFn({ method: "GET" }).handler(async () => {
  const { setResponseHeader } = await import("@tanstack/react-start/server");
  setResponseHeader("Cache-Control", "no-store");
  const rows = process.env["WHISPERS_PILOT_BACKEND"] === "neon"
    || process.env["WHISPERS_PUBLIC_FEED_BACKEND"] === "neon"
    ? await (await import("./neon-public-updates.server")).readNeonPublicUpdates()
    : await readSupabasePublicUpdates();
  return rows.map((u) => { const demo = typeof u.fictional === "boolean" ? u.fictional : true; return { id: String(u.id), title: String(u.title ?? ""), summary: String(u.summary ?? ""), known: String(u.known ?? ""), uncertain: String(u.uncertain ?? ""), sources: Array.isArray(u.sources) ? u.sources.filter((s): s is string => typeof s === "string") : [], publishedAt: String(u.published_at), withdrawn: Boolean(u.withdrawn), demo, broadContext: demo ? "Fictional connected pilot" : "Reviewed report", corrections: [] }; });
});
async function readSupabasePublicUpdates() {
  const { createClient } = await import("@supabase/supabase-js");
  const key = process.env["SUPABASE_PUBLISHABLE_KEY"];
  const url = process.env["SUPABASE_URL"];
  if (!key || !url) throw new Error("Updates unavailable.");
  const client = createClient(url, key, { auth: { persistSession: false }, global: { fetch: (input, init) => {
    const headers = new Headers(init?.headers);
    if (key.startsWith("sb_") && headers.get("Authorization") === `Bearer ${key}`) headers.delete("Authorization");
    headers.set("apikey", key);
    return fetch(input, { ...init, headers });
  } } });
  const result = await client.from("whispers_public_updates").select("id,title,summary,known,uncertain,sources,published_at,withdrawn").order("published_at", { ascending: false }).limit(100);
  if (result.error) throw new Error("Updates unavailable.");
  return result.data ?? [];
}

export const pilotCommand = createServerFn({ method: "POST" }).middleware([requireSupabaseAuth]).validator((input) => pilotCommandSchema.parse(input)).handler(async ({ data,context }) => {
  const { commandPilot } = await import("./pilot.server"); return commandPilot(context.supabase,context.userId,data);
});
export const pilotUpload = createServerFn({ method: "POST" }).validator((input) => z.object({ code: z.string().max(80), bytes: z.array(z.number().int().min(0).max(255)).max(1500000), uploadId: z.string().min(1).max(100) }).strict().parse(input)).handler(async ({ data }) => {
  if (process.env["WHISPERS_PILOT_BACKEND"] === "neon") {
    return (await import("./neon-citizen.server")).uploadNeonPilot(data);
  }
  const { uploadPilot } = await import("./pilot.server"); return uploadPilot(data);
});
