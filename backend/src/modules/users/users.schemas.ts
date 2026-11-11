import { UserStatus } from "@prisma/client";
import { z } from "zod";

export const createClientSchema = z.object({
  ipName: z.string().min(2).max(200),
  email: z.string().email(),
  phone: z.string().min(5).max(50),
  password: z.string().min(8).max(200),
  store: z.object({
    name: z.string().min(2).max(200),
    address: z.string().min(5).max(500),
    phone: z.string().max(50).optional(),
  }),
});

export const updateClientStatusSchema = z.object({
  status: z.nativeEnum(UserStatus),
  rejectionReason: z.string().max(1000).nullable().optional(),
});

export const updateClientPasswordSchema = z.object({
  password: z.string().min(8).max(200),
});

export type CreateClientInput = z.infer<typeof createClientSchema>;
export type UpdateClientStatusInput = z.infer<typeof updateClientStatusSchema>;
export type UpdateClientPasswordInput = z.infer<
  typeof updateClientPasswordSchema
>;
