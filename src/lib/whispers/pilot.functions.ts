import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { z } from "zod";
import { pilotSubmitSchema, pilotCommandSchema } from "./pilot-schema";

export const submitPilotReport = createServerFn({ method: "POST" }).inputValidator((input) => pilotSubmitSchema.parse(input)).handler(async ({ data }) => {
  const { submitPilot } = await import("./pilot.server"); return submitPilot(data);
});
export const pilotReceipt = createServerFn({ method: "POST" }).inputValidator((input) => z.object({ code: z.string().max(80), action: z.enum(["open","message","removal"]), text: z.string().max(2000).optional() }).strict().parse(input)).handler(async ({ data }) => {
  const { receiptPilot } = await import("./pilot.server"); return receiptPilot(data);
});
export const pilotStaff = createServerFn({ method: "POST" }).middleware([requireSupabaseAuth]).handler(async ({ context }) => {
  const { readPilot } = await import("./pilot.server"); return readPilot(context.supabase,context.userId);
});
export const pilotCommand = createServerFn({ method: "POST" }).middleware([requireSupabaseAuth]).inputValidator((input) => pilotCommandSchema.parse(input)).handler(async ({ data,context }) => {
  const { commandPilot } = await import("./pilot.server"); return commandPilot(context.supabase,context.userId,data);
});
export const pilotUpload = createServerFn({ method: "POST" }).inputValidator((input) => z.object({ code: z.string().max(80), bytes: z.array(z.number().int().min(0).max(255)).max(1500000) }).strict().parse(input)).handler(async ({ data }) => {
  const { uploadPilot } = await import("./pilot.server"); return uploadPilot(data);
});