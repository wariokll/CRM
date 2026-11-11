import { Priority } from "@prisma/client";
import { z } from "zod";

const templateField = z.object({
  key: z
    .string()
    .trim()
    .regex(/^[a-zA-Z][a-zA-Z0-9_]*$/)
    .max(80),
  label: z.string().trim().min(1).max(150),
  type: z.enum([
    "TEXT",
    "TEXTAREA",
    "NUMBER",
    "DATE",
    "SELECT",
    "CHECKBOX",
    "FILE",
  ]),
  required: z.boolean().default(false),
  options: z.array(z.string().trim().min(1).max(100)).max(50).optional(),
});

const componentRequirement = z.object({
  componentId: z.number().int().positive(),
  quantity: z.number().int().min(1).max(100000),
});

export const requestTypeSchema = z.object({
  name: z.string().trim().min(2).max(100),
  description: z.string().max(1000).nullable().optional(),
  color: z
    .string()
    .regex(/^#[0-9a-fA-F]{6}$/)
    .optional(),
  isActive: z.boolean().optional(),
  departmentId: z.number().int().positive(),
  requiresOrganization: z.boolean().default(true),
  requiresStore: z.boolean().default(true),
  availableOnWeb: z.boolean().default(true),
  availableOnTelegram: z.boolean().default(true),
  requiresComponents: z.boolean().default(false),
  defaultPriority: z.nativeEnum(Priority).default(Priority.NORMAL),
  templateFields: z.array(templateField).max(50).default([]),
  componentRequirements: z
    .array(componentRequirement)
    .max(50)
    .default([])
    .refine(
      (items) =>
        new Set(items.map((item) => item.componentId)).size === items.length,
      "Компонент нельзя добавить в шаблон дважды",
    ),
});

export const patchRequestTypeSchema = requestTypeSchema.partial();
export type CreateRequestTypeInput = z.infer<typeof requestTypeSchema>;
export type PatchRequestTypeInput = z.infer<typeof patchRequestTypeSchema>;
