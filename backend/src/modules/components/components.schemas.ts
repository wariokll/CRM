import { z } from "zod";

export const createComponentSchema = z.object({
  name: z.string().trim().min(2).max(200),
});

export const updateComponentSchema = z.object({
  name: z.string().trim().min(2).max(200).optional(),
  isActive: z.boolean().optional(),
});

export type CreateComponentInput = z.infer<typeof createComponentSchema>;
export type UpdateComponentInput = z.infer<typeof updateComponentSchema>;
