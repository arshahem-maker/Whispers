import { z } from "zod";
export const invitationSchema = z.object({ email: z.string().trim().email().max(254).transform((v) => v.toLowerCase()), role: z.enum(["reviewer", "expert"]), workspace: z.enum(["ua", "td", "general"]) }).strict();
export function canInvite(scopes: string[], workspace: string) { return scopes.includes(workspace); }