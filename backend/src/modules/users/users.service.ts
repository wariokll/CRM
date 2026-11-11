import {
  OrganizationStatus,
  OrganizationType,
  Role,
  StoreStatus,
  UserStatus,
} from "@prisma/client";
import bcrypt from "bcrypt";
import { prisma } from "../../db.js";
import type {
  CreateClientInput,
  UpdateClientPasswordInput,
  UpdateClientStatusInput,
} from "./users.schemas.js";

export async function listClients(search: string) {
  const users = await prisma.user.findMany({
    where: {
      role: Role.CLIENT,
      ...(search && {
        OR: [
          { ipName: { contains: search } },
          { email: { contains: search } },
          { phone: { contains: search } },
        ],
      }),
    },
    select: {
      id: true,
      ipName: true,
      email: true,
      phone: true,
      role: true,
      status: true,
      rejectionReason: true,
      createdAt: true,
      organizations: {
        include: {
          organization: {
            include: { stores: { orderBy: { createdAt: "asc" } } },
          },
        },
      },
      _count: { select: { createdRequests: true } },
    },
    orderBy: { createdAt: "desc" },
  });
  return users.map((user) => ({
    ...user,
    stores: user.organizations.flatMap((item) => item.organization.stores),
  }));
}

export async function createClient(body: CreateClientInput) {
  return prisma.$transaction(async (transaction) => {
    const created = await transaction.user.create({
      data: {
        ipName: body.ipName,
        email: body.email.toLowerCase(),
        phone: body.phone,
        passwordHash: await bcrypt.hash(body.password, 12),
        role: Role.CLIENT,
        status: UserStatus.ACTIVE,
      },
    });
    await transaction.organization.create({
      data: {
        type: /^\s*ип\b/i.test(body.ipName)
          ? OrganizationType.IP
          : /^\s*ооо\b/i.test(body.ipName)
            ? OrganizationType.OOO
            : OrganizationType.OTHER,
        legalName: body.ipName,
        shortName: body.ipName,
        phone: body.phone,
        email: body.email.toLowerCase(),
        status: OrganizationStatus.ACTIVE,
        createdByUserId: created.id,
        members: { create: { userId: created.id, isPrimary: true } },
        stores: {
          create: {
            ...body.store,
            userId: created.id,
            status: StoreStatus.ACTIVE,
          },
        },
      },
    });
    return created;
  });
}

export async function setClientStatus(
  id: number,
  body: UpdateClientStatusInput,
) {
  if (!Number.isInteger(id))
    return { status: 400 as const, message: "Некорректный идентификатор" };
  if (body.status === UserStatus.REJECTED && !body.rejectionReason?.trim())
    return { status: 400 as const, message: "Укажите причину отказа" };
  const user = await prisma.user.findFirst({
    where: { id, role: Role.CLIENT },
  });
  if (!user) return { status: 404 as const, message: "Клиент не найден" };
  const updated = await prisma.user.update({
    where: { id },
    data: {
      status: body.status,
      rejectionReason:
        body.status === UserStatus.REJECTED ? body.rejectionReason : null,
    },
  });
  return { status: 200 as const, user: updated };
}

export async function setClientPassword(
  id: number,
  body: UpdateClientPasswordInput,
) {
  const user = await prisma.user.findFirst({
    where: { id, role: Role.CLIENT },
  });
  if (!user) return false;
  await prisma.user.update({
    where: { id },
    data: { passwordHash: await bcrypt.hash(body.password, 12) },
  });
  return true;
}
