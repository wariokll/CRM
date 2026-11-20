import { OrganizationType } from "@prisma/client";
import { z } from "zod";

const optionalText = (max: number) =>
  z.preprocess(
    (value) => (typeof value === "string" && !value.trim() ? null : value),
    z.string().trim().max(max).optional().nullable(),
  );

const optionalEmail = z.preprocess(
  (value) => (typeof value === "string" && !value.trim() ? null : value),
  z.string().email().optional().nullable(),
);

const contactSchema = z.object({
  fullName: z.string().trim().min(2).max(200),
  phone: optionalText(50),
  note: optionalText(2000),
});

export const organizationSchema = z.object({
  type: z.nativeEnum(OrganizationType),
  legalName: z.string().trim().min(2).max(250),
  shortName: optionalText(200),
  inn: optionalText(20),
  kpp: optionalText(20),
  ogrn: optionalText(20),
  legalAddress: optionalText(1000),
  contactName: optionalText(200),
  phone: optionalText(50),
  email: optionalEmail,
  contacts: z.array(contactSchema).max(30).default([]),
});

export const requestedMemberIdsSchema = z
  .array(z.number().int().positive())
  .optional();
export const organizationMemberIdsSchema = z.object({
  userIds: z.array(z.number().int().positive()).min(1),
});
export const organizationRejectionSchema = z.object({
  rejectionReason: z.string().trim().min(3).max(1000),
});

export type OrganizationInput = z.infer<typeof organizationSchema>;
