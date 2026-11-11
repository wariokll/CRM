import { OrganizationStatus, StoreStatus, UserStatus } from "@prisma/client";
import { z } from "zod";

export const moderateUserSchema = z.object({
  status: z.enum([UserStatus.ACTIVE, UserStatus.REJECTED, UserStatus.BLOCKED]),
  rejectionReason: z.string().max(1000).optional(),
});

export const moderateOrganizationSchema = z.object({
  status: z.enum([OrganizationStatus.ACTIVE, OrganizationStatus.REJECTED]),
  rejectionReason: z.string().max(1000).optional(),
});

export const moderateStoreSchema = z.object({
  status: z.enum([StoreStatus.ACTIVE, StoreStatus.REJECTED]),
  rejectionReason: z.string().max(1000).optional(),
});

export type ModerateUserInput = z.infer<typeof moderateUserSchema>;
export type ModerateOrganizationInput = z.infer<
  typeof moderateOrganizationSchema
>;
export type ModerateStoreInput = z.infer<typeof moderateStoreSchema>;
