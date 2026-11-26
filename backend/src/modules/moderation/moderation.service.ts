import {
  OrganizationStatus,
  Role,
  StoreStatus,
  UserStatus,
} from "@prisma/client";
import type { PrismaClient } from "@prisma/client";
import { AppError } from "../../shared/errors.js";
import type {
  ModerateOrganizationInput,
  ModerateStoreInput,
  ModerateUserInput,
} from "./moderation.schemas.js";

export function createModerationService(prisma: PrismaClient) {
  async function listPendingUsers() {
    const users = await prisma.user.findMany({
      where: { role: Role.CLIENT, status: UserStatus.PENDING },
      include: {
        organizations: {
          include: { organization: { include: { stores: true } } },
        },
      },
      orderBy: { createdAt: "asc" },
    });
    return users.map((user) => ({
      ...user,
      stores: user.organizations.flatMap((item) => item.organization.stores),
    }));
  }

  function listPendingOrganizations() {
    return prisma.organization.findMany({
      where: { status: OrganizationStatus.PENDING },
      include: {
        members: {
          include: {
            user: {
              select: { id: true, ipName: true, email: true, phone: true },
            },
          },
        },
        stores: true,
      },
      orderBy: { createdAt: "asc" },
    });
  }

  async function listPendingStores() {
    const stores = await prisma.store.findMany({
      where: { status: StoreStatus.PENDING },
      include: {
        organization: {
          include: {
            members: {
              where: { isPrimary: true },
              take: 1,
              include: {
                user: {
                  select: { id: true, ipName: true, email: true, phone: true },
                },
              },
            },
          },
        },
      },
      orderBy: { createdAt: "asc" },
    });
    return stores.map((store) => ({
      ...store,
      user: store.organization.members[0]?.user,
      organization: store.organization,
    }));
  }

  function updateModeratedUser(id: number, body: ModerateUserInput) {
    if (body.status === UserStatus.REJECTED && !body.rejectionReason)
      throw new AppError("Укажите причину отказа", 400);
    return prisma.$transaction(async (transaction) => {
      const updated = await transaction.user.update({
        where: { id },
        data: {
          ...body,
          rejectionReason:
            body.status === UserStatus.REJECTED ? body.rejectionReason : null,
        },
      });
      if (body.status === UserStatus.ACTIVE) {
        await transaction.organization.updateMany({
          where: {
            members: { some: { userId: id } },
            status: OrganizationStatus.PENDING,
          },
          data: { status: OrganizationStatus.ACTIVE, rejectionReason: null },
        });
        await transaction.store.updateMany({
          where: {
            organization: { members: { some: { userId: id } } },
            status: StoreStatus.PENDING,
          },
          data: { status: StoreStatus.ACTIVE, rejectionReason: null },
        });
      }
      return updated;
    });
  }

  function updateModeratedOrganization(
    id: number,
    body: ModerateOrganizationInput,
  ) {
    if (
      body.status === OrganizationStatus.REJECTED &&
      !body.rejectionReason?.trim()
    )
      throw new AppError("Укажите причину отказа", 400);
    return prisma.organization.update({
      where: { id },
      data: {
        status: body.status,
        rejectionReason:
          body.status === OrganizationStatus.REJECTED
            ? body.rejectionReason
            : null,
      },
    });
  }

  function updateModeratedStore(id: number, body: ModerateStoreInput) {
    if (body.status === StoreStatus.REJECTED && !body.rejectionReason?.trim())
      throw new AppError("Укажите причину отказа", 400);
    return prisma.store.update({
      where: { id },
      data: {
        status: body.status,
        rejectionReason:
          body.status === StoreStatus.REJECTED ? body.rejectionReason : null,
      },
    });
  }

  return {
    listPendingUsers,
    listPendingOrganizations,
    listPendingStores,
    updateModeratedUser,
    updateModeratedOrganization,
    updateModeratedStore,
  };
}
