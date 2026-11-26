import { z } from "zod";
import { pilotCommandSchema } from "./pilot-schema";

const id = z.string().uuid();
export const publicationActions = ["submit_update", "disclosure", "approve", "publish", "withdraw"] as const;

export const editorialCommandSchema = z.object({
  editorial: z.discriminatedUnion("action", [
    z.object({ action: z.literal("request_experts"), id, packet: pilotCommandSchema.shape.packet.unwrap() }).strict(),
    z.object({
      action: z.literal("expert_response"), id,
      choice: pilotCommandSchema.shape.choice.unwrap(), text: z.string().trim().min(1).max(600),
    }).strict(),
    z.object({ action: z.literal("interpret"), id, text: z.string().trim().min(1).max(2000) }).strict(),
    z.object({ action: z.literal("draft_update"), id, update: pilotCommandSchema.shape.update.unwrap() }).strict(),
    z.object({ action: z.enum(publicationActions), id }).strict(),
  ]),
}).strict();

export type EditorialCommand = z.infer<typeof editorialCommandSchema>["editorial"];
