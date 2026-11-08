import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { z } from "zod";
import { pilotSubmitSchema, pilotCommandSchema } from "./pilot-schema";

export const submitPilotReport = createServerFn({ method: "POST" }).inputValidator((input) => pilotSubmitSchema.parse(input)).handler(async ({ data }) => {
  const { submitPilot } = await import("./pilot.server");
  const { getRequest, setResponseHeader } = await import("@tanstack/react-start/server");
  setResponseHeader("Cache-Control", "no-store");
  return submitPilot(data, getRequest());
});
export const pilotReceipt = createServerFn({ method: "POST" }).inputValidator((input) => z.object({ code: z.string().max(80), action: z.enum(["open","message","removal"]), text: z.string().max(2000).optional() }).strict().parse(input)).handler(async ({ data }) => {
  const { setResponseHeader } = await import("@tanstack/react-start/server"); setResponseHeader("Cache-Control", "no-store");
  const { receiptPilot } = await import("./pilot.server"); return receiptPilot(data);
});
export const pilotStaff = createServerFn({ method: "POST" }).middleware([requireSupabaseAuth]).handler(async ({ context }) => {
  const { setResponseHeader } = await import("@tanstack/react-start/server"); setResponseHeader("Cache-Control", "no-store");
  const { readPilot } = await import("./pilot.server"); return readPilot(context.supabase,context.userId);
});
export const acceptStaffInvitations = createServerFn({ method: "POST" }).middleware([requireSupabaseAuth]).handler(async ({ context }) => {
  const result = await context.supabase.rpc("whispers_accept_staff_invitations");
  if(result.error) throw new Error("A verified invited account is required.");
  return { accepted: result.data };
});
export const pilotPublicUpdates = createServerFn({ method: "GET" }).handler(async () => {
  const { createClient } = await import("@supabase/supabase-js");
  const key = process.env['SUPABASE_PUBLISHABLE_KEY']; const url = process.env['SUPABASE_URL'];
  if (!key || !url) throw new Error("Updates unavailable.");
  const client = createClient(url, key, { auth: { persistSession: false }, global: { fetch: (input, init) => {
    const headers = new Headers(init?.headers); if (key.startsWith("sb_") && headers.get("Authorization") === `Bearer ${key}`) headers.delete("Authorization"); headers.set("apikey", key); return fetch(input, { ...init, headers });
  } } });
  const result = await client.from("whispers_public_updates").select("id,title,summary,known,uncertain,sources,published_at,withdrawn").order("published_at", { ascending: false }).limit(100);
  if (result.error) throw new Error("Updates unavailable.");
  return (result.data ?? []).map((u) => ({ id: String(u.id), title: String(u.title ?? ""), summary: String(u.summary ?? ""), known: String(u.known ?? ""), uncertain: String(u.uncertain ?? ""), sources: Array.isArray(u.sources) ? u.sources.filter((s): s is string => typeof s === "string") : [], publishedAt: String(u.published_at), withdrawn: Boolean(u.withdrawn), demo: true as const, broadContext: "Fictional connected pilot", corrections: [] }));
});
export const pilotCommand = createServerFn({ method: "POST" }).middleware([requireSupabaseAuth]).inputValidator((input) => pilotCommandSchema.parse(input)).handler(async ({ data,context }) => {
  const { commandPilot } = await import("./pilot.server"); return commandPilot(context.supabase,context.userId,data);
});
export const pilotUpload = createServerFn({ method: "POST" }).inputValidator((input) => z.object({ code: z.string().max(80), bytes: z.array(z.number().int().min(0).max(255)).max(1500000), uploadId: z.string().min(1).max(100) }).strict().parse(input)).handler(async ({ data }) => {
  const { uploadPilot } = await import("./pilot.server"); return uploadPilot(data);
});