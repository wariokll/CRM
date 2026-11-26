import { Role, StoreStatus, UserStatus } from "@prisma/client";
import { z } from "zod";

const dateValueSchema = z.union([z.date(), z.string().datetime()]);

export const userSummaryDtoSchema = z
  .object({
    id: z.number().int().positive(),
    ipName: z.string(),
    email: z.string(),
    phone: z.string(),
    role: z.nativeEnum(Role),
    status: z.nativeEnum(UserStatus),
  })
  .passthrough();

export const boardAccessUserDtoSchema = z
  .object({
    id: z.number().int().positive(),
    ipName: z.string(),
    email: z.string(),
    role: z.nativeEnum(Role),
    hasAccess: z.boolean(),
    isOwner: z.boolean(),
  })
  .passthrough();

export const requestAssigneeDtoSchema = z
  .object({
    id: z.number().int().positive(),
    ipName: z.string(),
    email: z.string(),
    role: z.nativeEnum(Role),
    departmentMemberships: z.array(
      z
        .object({
          departmentId: z.number().int().positive(),
          membershipRole: z.enum(["HEAD", "MASTER"]),
          department: z
            .object({
              id: z.number().int().positive(),
              name: z.string(),
              slug: z.string(),
              isActive: z.boolean(),
            })
            .passthrough(),
        })
        .passthrough(),
    ),
  })
  .passthrough();

export const organizationContactDtoSchema = z
  .object({
    id: z.number().int().positive(),
    fullName: z.string(),
    phone: z.string().nullable(),
    note: z.string().nullable(),
  })
  .passthrough();

export const organizationMemberDtoSchema = z
  .object({
    user: z
      .object({
        id: z.number().int().positive(),
        ipName: z.string(),
        email: z.string(),
        phone: z.string(),
        status: z.nativeEnum(UserStatus),
      })
      .passthrough(),
    isPrimary: z.boolean(),
  })
  .passthrough();

export const storeSummaryDtoSchema = z
  .object({
    id: z.number().int().positive(),
    organizationId: z.number().int().positive(),
    name: z.string(),
    address: z.string(),
    phone: z.string().nullable(),
    status: z.nativeEnum(StoreStatus),
    user: z
      .object({
        id: z.number().int().positive(),
        ipName: z.string(),
        phone: z.string(),
        status: z.nativeEnum(UserStatus),
      })
      .passthrough(),
    access: z
      .object({
        anydeskId: z.string().nullable(),
        ofdUrl: z.string().nullable(),
        ofdLogin: z.string().nullable(),
        nalogUrl: z.string().nullable(),
        nalogLogin: z.string().nullable(),
        updatedAt: dateValueSchema,
      })
      .passthrough()
      .nullable(),
    _count: z
      .object({ requests: z.number().int().nonnegative() })
      .passthrough(),
  })
  .passthrough();

export const clientSummaryDtoSchema = userSummaryDtoSchema
  .extend({
    rejectionReason: z.string().nullable(),
    createdAt: dateValueSchema,
    stores: z.array(
      z
        .object({
          id: z.number().int().positive(),
          organizationId: z.number().int().positive(),
          name: z.string(),
          address: z.string(),
          phone: z.string().nullable(),
          status: z.nativeEnum(StoreStatus),
        })
        .passthrough(),
    ),
    _count: z
      .object({ createdRequests: z.number().int().nonnegative() })
      .passthrough(),
  })
  .passthrough();

export const organizationRelationsDtoSchema = z
  .object({
    contacts: z.array(organizationContactDtoSchema),
    members: z.array(organizationMemberDtoSchema),
  })
  .passthrough();
