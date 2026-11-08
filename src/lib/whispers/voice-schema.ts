import { z } from "zod";
import { PILOT_COUNTRIES } from "./locations";
import type { Draft } from "./context";

export const voiceResultSchema = z.object({
  language: z.string(), originalTranscript: z.string(), englishTranscript: z.string(),
  sounds: z.array(z.string()),
  category: z.enum(["safety", "shelter", "food_water", "health", "infrastructure", "aid_concern", "other", "not_selected"]),
  basis: z.enum(["saw", "happened_to_me", "told", "not_sure"]).nullable(),
  country: z.string().nullable(), area: z.string().nullable(),
  time: z.enum(["today", "yesterday", "last_week", "earlier", "not_sure"]).nullable(),
  impacts: z.array(z.enum(["safety", "food_water", "healthcare", "movement", "shelter", "not_sure"])),
}).strict();
export type VoiceResult = z.infer<typeof voiceResultSchema>;
export const VOICE_MAX_BYTES = 12 * 1024 * 1024;
export const VOICE_MAX_SECONDS = 90;

export function applyVoiceDraft(draft: Draft, result: VoiceResult): Draft {
  const pilot = PILOT_COUNTRIES.find((c) => c.code === result.country);
  const country = pilot?.code ?? (result.country ? "other" : null);
  const area = pilot?.areas.some((a) => a.id === result.area) ? result.area ?? "unknown" : "unknown";
  const observations = result.sounds.length ? `\n\nUnverified AI sound observations (not proof of their cause):\n${result.sounds.map((s) => `• ${s}`).join("\n")}` : "";
  // Never silently truncate testimony; the report's existing length validation handles long drafts.
  return { ...draft, text: result.englishTranscript + observations, category: result.category,
    basis: result.basis, country, area, time: result.time, impacts: [...new Set(result.impacts)],
    publicPermission: false, ack: false };
}