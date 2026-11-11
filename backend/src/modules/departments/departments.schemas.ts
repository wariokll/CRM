import { z } from "zod";

export const departmentSchema = z.object({
  name: z.string().trim().min(2).max(100),
  slug: z
    .string()
    .trim()
    .regex(/^[a-z0-9-]+$/)
    .max(80),
  isActive: z.boolean().optional(),
});

export const departmentPatchSchema = departmentSchema.partial();
export type DepartmentInput = z.infer<typeof departmentSchema>;
export type DepartmentPatch = z.infer<typeof departmentPatchSchema>;
