import { z } from "zod";
import { invitationSchema } from "./staff-invitations";
export const pilotReportSchema = z.object({
  text: z.string().trim().min(10).max(2000),
  category: z.enum(["safety","shelter","food_water","health","infrastructure","aid_concern","other","not_selected"]),
  knowledgeBasis: z.enum(["saw","happened_to_me","told","not_sure"]),
  countryCode: z.enum(["UA","TD","other","not_shared"]), areaId: z.string().max(60),
  timeBucket: z.enum(["today","yesterday","last_week","earlier","not_sure"]),
  impacts: z.array(z.enum(["safety","food_water","healthcare","movement","shelter","not_sure"])).max(6),
  publicSummaryPermission: z.boolean(), acknowledged: z.literal(true),
}).strict();
export const pilotSubmitSchema = z.object({ payload: pilotReportSchema, codeHash: z.string().regex(/^[0-9a-f]{64}$/), idempotencyKey: z.string().min(8).max(100), fictional: z.literal(true) }).strict();
export const pilotCommandSchema = z.object({
  action: z.enum(["reply","assess","note","evidence","request_experts","interpret","expert_response","draft_update","submit_update","disclosure","approve","publish","withdraw","remove","extend","resume_voice","staff_role","release_review","operator","invite_staff","revoke_invitation"]),
  invitation: invitationSchema.optional(),
  staff: z.object({ userId: z.string().uuid(), role: z.enum(["reviewer","expert","publisher","admin"]), contexts: z.array(z.enum(["ua","td","general"])).min(1).max(3), active: z.boolean() }).strict().optional(),
  review: z.object({ kind: z.enum(["translation","security","legal","safety"]), reference: z.string().trim().min(5).max(500) }).strict().optional(),
  operator: z.object({ name: z.string().trim().min(2).max(150), contact: z.string().trim().min(5).max(250) }).strict().optional(),
  id: z.string().uuid().optional(), text: z.string().max(2000).optional(),
  state: z.string().max(30).optional(), choice: z.enum(["consistent","conflicting","cannot_assess"]).optional(),
  packet: z.object({ claim: z.string().min(1).max(600), context: z.string().max(200), period: z.string().max(100), materials: z.string().max(2000), question: z.string().min(1).max(600) }).strict().optional(),
  update: z.object({ title: z.string().min(1).max(150), summary: z.string().min(1).max(2000), known: z.string().max(1000), uncertain: z.string().min(1).max(1000), sources: z.array(z.string().url()).max(10) }).strict().optional(),
  nextReview: z.string().datetime().optional(),
}).strict();
export function publicationProblems(report: { revoked_at: string | null; expires_at: string; body: Record<string, unknown> }, now = Date.now()) {
  const problems: string[] = [];
  if (report.revoked_at || new Date(report.expires_at).getTime() <= now) problems.push("The source report is removed or expired.");
  if (report.body['publicSummaryPermission'] !== true) problems.push("The contributor did not allow public use.");
  if (report.body['sensitivity'] === "restricted") problems.push("Restricted reports cannot be published.");
  return problems;
}