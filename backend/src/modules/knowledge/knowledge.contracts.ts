import { z } from "zod";

export const knowledgeIdSchema = z.coerce.number().int().positive();
export const sectionInputSchema = z.object({
  name: z.string().trim().min(2).max(160),
  parentId: knowledgeIdSchema.nullable().optional(),
  position: z.number().int().min(0).optional(),
});
export const articleInputSchema = z.object({
  sectionId: knowledgeIdSchema,
  title: z.string().trim().min(2).max(240),
  body: z.string().max(900_000),
  position: z.number().int().min(0).optional(),
});
export const articleSearchSchema = z.string().trim().max(200).optional();

export type SectionInput = z.infer<typeof sectionInputSchema>;
export type ArticleInput = z.infer<typeof articleInputSchema>;
