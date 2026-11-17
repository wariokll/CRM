import { z } from "zod";

export const storeSchema = z.object({
  organizationId: z.number().int().positive(),
  name: z.string().min(2),
  address: z.string().min(5),
  phone: z.string().optional().nullable(),
});

export const storeAccessSchema = z.object({
  anydeskId: z.string().max(80).optional().nullable(),
  anydeskPassword: z.string().max(300).optional().nullable(),
  ofdUrl: z.string().url().optional().nullable(),
  ofdLogin: z.string().max(200).optional().nullable(),
  ofdPassword: z.string().max(300).optional().nullable(),
  nalogUrl: z.string().url().optional().nullable(),
  nalogLogin: z.string().max(200).optional().nullable(),
  nalogPassword: z.string().max(300).optional().nullable(),
});

export const rejectionSchema = z.object({
  rejectionReason: z.string().trim().min(3).max(1000),
});

export type StoreInput = z.infer<typeof storeSchema>;
export type StoreAccessInput = z.infer<typeof storeAccessSchema>;
