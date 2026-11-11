import {
  DepartmentMembershipRole,
  PermissionKey,
  Role,
  UserStatus,
} from "@prisma/client";
import { z } from "zod";

const staffRole = z.enum([Role.DIRECTOR, Role.DEPARTMENT_HEAD, Role.MASTER]);

export const createStaffSchema = z.object({
  name: z.string().trim().min(2).max(200),
  email: z.string().email(),
  phone: z.string().trim().min(5).max(50),
  password: z.string().min(8).max(200),
  role: staffRole,
  departmentIds: z.array(z.number().int().positive()).default([]),
});

export const updateStaffSchema = z.object({
  name: z.string().trim().min(2).max(200).optional(),
  email: z.string().email().optional(),
  phone: z.string().trim().min(5).max(50).optional(),
  status: z.enum([UserStatus.ACTIVE, UserStatus.BLOCKED]).optional(),
});

export const updateStaffAccessSchema = z.object({
  role: staffRole,
  departments: z.array(
    z.object({
      departmentId: z.number().int().positive(),
      membershipRole: z.nativeEnum(DepartmentMembershipRole),
    }),
  ),
  permissions: z.array(
    z.object({
      permission: z.nativeEnum(PermissionKey),
      enabled: z.boolean(),
    }),
  ),
});

export const updateStaffPasswordSchema = z.object({
  password: z.string().min(8).max(200),
});

export type CreateStaffInput = z.infer<typeof createStaffSchema>;
export type UpdateStaffInput = z.infer<typeof updateStaffSchema>;
export type UpdateStaffAccessInput = z.infer<typeof updateStaffAccessSchema>;
export type UpdateStaffPasswordInput = z.infer<
  typeof updateStaffPasswordSchema
>;
