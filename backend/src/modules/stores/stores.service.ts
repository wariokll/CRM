import { PermissionKey, Role, StoreStatus, UserStatus } from "@prisma/client";
import type { StoreSummaryDTO } from "@crm/shared-types";
import { config } from "../../config.js";
import { prisma } from "../../db.js";
import { storeSummaryDtoSchema } from "../../shared/response-schemas.js";
import {
  getUserAccess,
  hasPermission,
} from "../../shared/middleware/authorization.js";
import { decrypt, encrypt } from "../../utils/crypto.js";
import {
  rejectionSchema,
  storeAccessSchema,
  storeSchema,
  type StoreAccessInput,
} from "./stores.contracts.js";

export class StoresServiceError extends Error {
  constructor(
    readonly status: number,
    message: string,
  ) {
    super(message);
  }
}

const include = {
  organization: {
    include: {
      members: {
        where: { isPrimary: true },
        take: 1,
        include: {
          user: {
            select: { id: true, ipName: true, phone: true, status: true },
          },
        },
      },
    },
  },
  access: {
    select: {
      anydeskId: true,
      ofdUrl: true,
      ofdLogin: true,
      nalogUrl: true,
      nalogLogin: true,
      updatedAt: true,
    },
  },
  _count: { select: { requests: true } },
} as const;

function present<
  T extends {
    organization: {
      legalName: string;
      members: Array<{
        user: {
          id: number;
          ipName: string;
          phone: string;
          status: UserStatus;
        };
      }>;
    };
  },
>(store: T): T & { user: T["organization"]["members"][number]["user"] } {
  return {
    ...store,
    user: store.organization.members[0]?.user ?? {
      id: 0,
      ipName: store.organization.legalName,
      phone: "",
      status: "ACTIVE",
    },
  };
}

async function canUseOrganization(
  userId: number,
  organizationId: number,
  managePermission: PermissionKey = PermissionKey.MANAGE_STORES,
) {
  const access = await getUserAccess(userId);
  if (!access) return false;
  if (access.role !== Role.CLIENT && hasPermission(access, managePermission))
    return true;
  if (
    access.role !== Role.CLIENT &&
    managePermission === PermissionKey.VIEW_STORE_SECRETS &&
    hasPermission(access, PermissionKey.VIEW_STORE_SECRETS)
  )
    return true;
  return Boolean(
    await prisma.organizationMember.findUnique({
      where: { organizationId_userId: { organizationId, userId } },
    }),
  );
}

async function visibleStore(
  id: number,
  userId: number,
  permission: PermissionKey = PermissionKey.MANAGE_STORES,
) {
  const store = await prisma.store.findUnique({ where: { id } });
  if (
    !store ||
    !(await canUseOrganization(userId, store.organizationId, permission))
  )
    return null;
  return store;
}

export async function listStores(userId: number) {
  const access = await getUserAccess(userId);
  if (!access) throw new StoresServiceError(401, "Пользователь не найден");
  const where =
    access.role === Role.CLIENT
      ? { organization: { members: { some: { userId } } } }
      : {};
  const stores = await prisma.store.findMany({
    where,
    include,
    orderBy: { updatedAt: "desc" },
  });
  return stores.map(
    (store) =>
      storeSummaryDtoSchema.parse(present(store)) satisfies StoreSummaryDTO,
  );
}

export async function createStore(userId: number, input: unknown) {
  const body = storeSchema.parse(input);
  const access = await getUserAccess(userId);
  if (!access || !(await canUseOrganization(userId, body.organizationId)))
    throw new StoresServiceError(403, "Нет доступа к организации");
  const activeImmediately =
    access.role !== Role.CLIENT &&
    hasPermission(access, PermissionKey.MANAGE_STORES);
  const store = await prisma.store.create({
    data: {
      ...body,
      userId: access.role === Role.CLIENT ? userId : null,
      status: activeImmediately ? StoreStatus.ACTIVE : StoreStatus.PENDING,
    },
    include,
  });
  return storeSummaryDtoSchema.parse(present(store)) satisfies StoreSummaryDTO;
}

export async function updateStore(id: number, userId: number, input: unknown) {
  const store = await visibleStore(id, userId);
  if (!store) throw new StoresServiceError(404, "Точка не найдена");
  const body = storeSchema.partial().parse(input);
  if (
    body.organizationId &&
    !(await canUseOrganization(userId, body.organizationId))
  )
    throw new StoresServiceError(403, "Нет доступа к организации");
  const access = await getUserAccess(userId);
  const updated = await prisma.store.update({
    where: { id: store.id },
    data: {
      ...body,
      ...(access?.role === Role.CLIENT && { status: StoreStatus.PENDING }),
    },
    include,
  });
  return storeSummaryDtoSchema.parse(
    present(updated),
  ) satisfies StoreSummaryDTO;
}

export async function deleteStore(id: number, userId: number) {
  const access = await getUserAccess(userId);
  if (
    !access ||
    access.status !== "ACTIVE" ||
    !hasPermission(access, PermissionKey.DELETE_STORES)
  )
    throw new StoresServiceError(
      403,
      "Недостаточно прав для удаления торговых точек",
    );
  const store = await prisma.store.findUnique({
    where: { id },
    select: { id: true },
  });
  if (!store) throw new StoresServiceError(404, "Точка не найдена");
  await prisma.store.delete({ where: { id } });
}

export async function getStoreAccess(id: number, userId: number) {
  const store = await visibleStore(
    id,
    userId,
    PermissionKey.VIEW_STORE_SECRETS,
  );
  if (!store) throw new StoresServiceError(404, "Точка не найдена");
  const access = await prisma.storeAccess.findUnique({
    where: { storeId: store.id },
  });
  if (!access) return null;
  return {
    ...access,
    anydeskPassword:
      access.anydeskPasswordEncrypted &&
      decrypt(access.anydeskPasswordEncrypted, config.encryptionKey),
    ofdPassword:
      access.ofdPasswordEncrypted &&
      decrypt(access.ofdPasswordEncrypted, config.encryptionKey),
    nalogPassword:
      access.nalogPasswordEncrypted &&
      decrypt(access.nalogPasswordEncrypted, config.encryptionKey),
    anydeskPasswordEncrypted: undefined,
    ofdPasswordEncrypted: undefined,
    nalogPasswordEncrypted: undefined,
  };
}

export async function updateStoreAccess(
  id: number,
  userId: number,
  input: unknown,
) {
  const store = await prisma.store.findUnique({ where: { id } });
  const access = await getUserAccess(userId);
  if (
    !store ||
    !access ||
    access.status !== "ACTIVE" ||
    access.role === Role.CLIENT
  )
    throw new StoresServiceError(
      404,
      "Точка не найдена или доступна только сотрудникам",
    );
  const body: StoreAccessInput = storeAccessSchema.parse(input);
  const data = {
    anydeskId: body.anydeskId,
    ofdUrl: body.ofdUrl,
    ofdLogin: body.ofdLogin,
    nalogUrl: body.nalogUrl,
    nalogLogin: body.nalogLogin,
    ...(body.anydeskPassword !== undefined && {
      anydeskPasswordEncrypted: body.anydeskPassword
        ? encrypt(body.anydeskPassword, config.encryptionKey)
        : null,
    }),
    ...(body.ofdPassword !== undefined && {
      ofdPasswordEncrypted: body.ofdPassword
        ? encrypt(body.ofdPassword, config.encryptionKey)
        : null,
    }),
    ...(body.nalogPassword !== undefined && {
      nalogPasswordEncrypted: body.nalogPassword
        ? encrypt(body.nalogPassword, config.encryptionKey)
        : null,
    }),
    updatedByUserId: userId,
  };
  await prisma.storeAccess.upsert({
    where: { storeId: store.id },
    create: { storeId: store.id, ...data },
    update: data,
  });
}

export async function approveStore(id: number, userId: number) {
  const access = await getUserAccess(userId);
  if (!access || access.status !== "ACTIVE" || access.role === Role.CLIENT)
    throw new StoresServiceError(
      403,
      "Принять точку может только активный сотрудник",
    );
  const store = await prisma.store.findFirst({
    where: { id, status: StoreStatus.PENDING },
    select: { id: true },
  });
  if (!store)
    throw new StoresServiceError(404, "Точка на модерации не найдена");
  return prisma.store.update({
    where: { id: store.id },
    data: { status: StoreStatus.ACTIVE, rejectionReason: null },
  });
}

export async function rejectStore(id: number, userId: number, input: unknown) {
  const access = await getUserAccess(userId);
  if (!access || access.status !== "ACTIVE" || access.role === Role.CLIENT)
    throw new StoresServiceError(
      403,
      "Отклонить точку может только активный сотрудник",
    );
  const body = rejectionSchema.parse(input);
  const store = await prisma.store.findFirst({
    where: { id, status: StoreStatus.PENDING },
    select: { id: true },
  });
  if (!store)
    throw new StoresServiceError(404, "Точка на модерации не найдена");
  return prisma.store.update({
    where: { id: store.id },
    data: {
      status: StoreStatus.REJECTED,
      rejectionReason: body.rejectionReason,
    },
  });
}
