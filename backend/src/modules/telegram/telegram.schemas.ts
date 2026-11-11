import { z } from "zod";

export const updateTelegramChatSchema = z.object({
  linkedUserId: z.number().int().positive().nullable().optional(),
  organizationId: z.number().int().positive().nullable().optional(),
  storeId: z.number().int().positive().nullable().optional(),
  contactId: z.number().int().positive().nullable().optional(),
});

export const replaceTelegramLinksSchema = z.object({
  organizationIds: z.array(z.number().int().positive()).default([]),
  storeIds: z.array(z.number().int().positive()).default([]),
});

export const sendTelegramMessageSchema = z.object({
  body: z.string().trim().min(1).max(4096),
});

export type UpdateTelegramChatInput = z.infer<typeof updateTelegramChatSchema>;
export type ReplaceTelegramLinksInput = z.infer<
  typeof replaceTelegramLinksSchema
>;
export type SendTelegramMessageInput = z.infer<
  typeof sendTelegramMessageSchema
>;
