import { OrganizationStatus, PermissionKey, Role } from "@prisma/client";
import { prisma } from "../../db.js";
import {
  getUserAccess,
  hasPermission,
} from "../../shared/middleware/authorization.js";
import {
  organizationMemberIdsSchema,
  organizationRejectionSchema,
  organizationSchema,
  requestedMemberIdsSchema,
} from "./organizations.contracts.js";

export class OrganizationsServiceError extends Error {
  constructor(
    readonly status: number,
    message: string,
  ) {
    super(message);
  }
}

const include = {
  members: {
    include: {
      user: {
        select: {
          id: true,
          ipName: true,
          email: true,
          phone: true,
          status: true,
        },
      },
    },
  },
  stores: { orderBy: { name: "asc" as const } },
  contacts: { orderBy: { id: "asc" as const } },
  _count: { select: { requests: true } },
} as const;

async function context(userId: number) {
  const access = await getUserAccess(userId);
  if (!access) return null;
  return {
    access,
    manages: hasPermission(access, PermissionKey.MANAGE_ORGANIZATIONS),
  };
}

export async function listOrganizations(userId: number) {
  const ctx = await context(userId);
  if (!ctx) throw new OrganizationsServiceError(401, "Пользователь не найден");
  const where =
    ctx.manages || ctx.access.role !== Role.CLIENT
      ? {}
      : { members: { some: { userId } } };
  return prisma.organization.findMany({
    where,
    include,
    orderBy: { legalName: "asc" },
  });
}

export async function createOrganization(userId: number, input: unknown) {
  const ctx = await context(userId);
  if (!ctx) throw new OrganizationsServiceError(401, "Пользователь не найден");
  const body = organizationSchema.parse(input);
  const requestedMembers = requestedMemberIdsSchema.parse(
    (input as { memberIds?: unknown }).memberIds,
  );
  const memberIds =
    ctx.manages && requestedMembers?.length
      ? [...new Set(requestedMembers)]
      : [userId];
  const { contacts, ...organizationData } = body;
  return prisma.organization.create({
    data: {
      ...organizationData,
      status: ctx.manages
        ? OrganizationStatus.ACTIVE
        : OrganizationStatus.PENDING,
      createdByUserId: userId,
      members: {
        create: memberIds.map((memberId, index) => ({
          userId: memberId,
          isPrimary: index === 0,
        })),
      },
      contacts: contacts.length ? { create: contacts } : undefined,
    },
    include,
  });
}

export async function updateOrganization(
  id: number,
  userId: number,
  input: unknown,
) {
  const ctx = await context(userId);
  if (!ctx) throw new OrganizationsServiceError(401, "Пользователь не найден");
  const existing = await prisma.organization.findUnique({
    where: { id },
    select: {
      members: {
        where: { userId },
        select: { userId: true },
      },
    },
  });
  if (!existing || (!ctx.manages && !existing.members.length))
    throw new OrganizationsServiceError(404, "Организация не найдена");
  const data = organizationSchema.partial().parse(input);
  const { contacts, ...organizationData } = data;
  return prisma.organization.update({
    where: { id },
    data: {
      ...organizationData,
      ...(contacts !== undefined && {
        contacts: { deleteMany: {}, create: contacts },
      }),
      ...(!ctx.manages && { status: OrganizationStatus.PENDING }),
    },
    include,
  });
}

export async function deleteOrganization(id: number, userId: number) {
  const access = await getUserAccess(userId);
  if (
    !access ||
    access.status !== "ACTIVE" ||
    !hasPermission(access, PermissionKey.DELETE_ORGANIZATIONS)
  )
    throw new OrganizationsServiceError(
      403,
      "Недостаточно прав для удаления организаций",
    );
  const organization = await prisma.organization.findUnique({
    where: { id },
    select: { id: true },
  });
  if (!organization)
    throw new OrganizationsServiceError(404, "Организация не найдена");
  await prisma.organization.delete({ where: { id } });
}

export async function updateOrganizationMembers(
  id: number,
  userId: number,
  input: unknown,
) {
  const ctx = await context(userId);
  if (!ctx?.manages)
    throw new OrganizationsServiceError(403, "Недостаточно прав");
  const memberIds = [
    ...new Set(organizationMemberIdsSchema.parse(input).userIds),
  ];
  await prisma.$transaction(async (transaction) => {
    await transaction.organizationMember.deleteMany({
      where: { organizationId: id },
    });
    await transaction.organizationMember.createMany({
      data: memberIds.map((memberId, index) => ({
        organizationId: id,
        userId: memberId,
        isPrimary: index === 0,
      })),
    });
  });
  return prisma.organization.findUniqueOrThrow({ where: { id }, include });
}

export async function approveOrganization(id: number, userId: number) {
  const access = await getUserAccess(userId);
  if (!access || access.status !== "ACTIVE" || access.role === Role.CLIENT)
    throw new OrganizationsServiceError(
      403,
      "Принять организацию может только активный сотрудник",
    );
  const organization = await prisma.organization.findFirst({
    where: { id, status: OrganizationStatus.PENDING },
    select: { id: true },
  });
  if (!organization)
    throw new OrganizationsServiceError(
      404,
      "Организация на модерации не найдена",
    );
  await prisma.$transaction(async (transaction) => {
    await transaction.organization.update({
      where: { id: organization.id },
      data: { status: OrganizationStatus.ACTIVE, rejectionReason: null },
    });
    await transaction.store.updateMany({
      where: { organizationId: organization.id, status: "PENDING" },
      data: { status: "ACTIVE", rejectionReason: null },
    });
    await transaction.user.updateMany({
      where: {
        status: "PENDING",
        role: Role.CLIENT,
        organizations: { some: { organizationId: organization.id } },
      },
      data: { status: "ACTIVE", rejectionReason: null },
    });
  });
  return prisma.organization.findUniqueOrThrow({
    where: { id: organization.id },
    include,
  });
}

export async function rejectOrganization(
  id: number,
  userId: number,
  input: unknown,
) {
  const access = await getUserAccess(userId);
  if (!access || access.status !== "ACTIVE" || access.role === Role.CLIENT)
    throw new OrganizationsServiceError(
      403,
      "Отклонить организацию может только активный сотрудник",
    );
  const body = organizationRejectionSchema.parse(input);
  const organization = await prisma.organization.findFirst({
    where: { id, status: OrganizationStatus.PENDING },
    select: { id: true },
  });
  if (!organization)
    throw new OrganizationsServiceError(
      404,
      "Организация на модерации не найдена",
    );
  return prisma.organization.update({
    where: { id: organization.id },
    data: {
      status: OrganizationStatus.REJECTED,
      rejectionReason: body.rejectionReason,
    },
    include,
  });
}
