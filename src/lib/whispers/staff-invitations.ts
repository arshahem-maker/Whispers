import { z } from "zod";
export const invitationSchema = z.object({ email: z.string().trim().email().max(254).transform((v) => v.toLowerCase()), role: z.enum(["reviewer", "expert"]), workspace: z.enum(["ua", "td", "general"]) }).strict();
export function canInvite(scopes: string[], workspace: string) { return scopes.includes(workspace); }
export const releaseReviewKinds = ["translation", "security", "legal", "safety"] as const;
export const neonInvitationCommandSchema = z.discriminatedUnion("action", [
  z.object({ action: z.literal("invite_staff"), invitation: invitationSchema }).strict(),
  z.object({ action: z.literal("release_review"), kind: z.enum(releaseReviewKinds), reference: z.string().trim().min(5).max(500), completed: z.literal(true) }).strict(),
  z.object({ action: z.literal("revoke_invitation"), id: z.string().uuid() }).strict(),
  z.object({
    action: z.literal("staff_role"), userId: z.string().uuid(),
    role: z.enum(["reviewer", "expert", "publisher", "admin"]),
    workspace: invitationSchema.shape.workspace, active: z.boolean(),
  }).strict(),
]);

export type NeonInvitationCommand = z.infer<typeof neonInvitationCommandSchema>;
