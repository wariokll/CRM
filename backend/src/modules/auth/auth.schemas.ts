import { z } from "zod";

export const registerSchema = z.object({
  ipName: z.string().min(2),
  email: z.string().email(),
  password: z.string().min(8),
  phone: z.string().min(5),
  store: z.object({
    name: z.string().min(2),
    address: z.string().min(5),
    phone: z.string().optional(),
  }),
});

export const loginSchema = z.object({
  email: z.string().email(),
  password: z.string().min(1),
});

export type RegisterInput = z.infer<typeof registerSchema>;
export type LoginInput = z.infer<typeof loginSchema>;

export const publicUserSelect = {
  id: true,
  ipName: true,
  email: true,
  phone: true,
  role: true,
  status: true,
  rejectionReason: true,
  createdAt: true,
  permissionOverrides: { select: { permission: true, enabled: true } },
  departmentMemberships: { include: { department: true } },
  organizations: { include: { organization: true } },
} as const;
