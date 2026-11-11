import { DepartmentMembershipRole, Role, UserStatus } from "@prisma/client";
import bcrypt from "bcrypt";
import { randomBytes } from "node:crypto";
import { config } from "../../config.js";
import { prisma } from "../../db.js";
import { AppError } from "../../shared/errors.js";
import type {
  CreateStaffInput,
  UpdateStaffAccessInput,
  UpdateStaffInput,
  UpdateStaffPasswordInput,
} from "./staff.schemas.js";
import { staffSelect } from "./staff.mapper.js";

export const staffMessages = {
  notFound: "Сотрудник не найден",
  selfRole: "Нельзя снять роль руководителя у собственной учётной записи",
  activeNotFound: "ACTIVE_Сотрудник не найден",
};

export function listStaff() {
  return prisma.user.findMany({
    where: { role: { not: Role.CLIENT } },
    select: staffSelect,
    orderBy: [{ role: "asc" }, { ipName: "asc" }],
  });
}

export async function createStaff(body: CreateStaffInput) {
  return prisma.user.create({
    data: {
      ipName: body.name,
      email: body.email.toLowerCase(),
      phone: body.phone,
      passwordHash: await bcrypt.hash(body.password, 12),
      role: body.role,
      status: UserStatus.ACTIVE,
      departmentMemberships: {
        create: body.departmentIds.map((departmentId) => ({
          departmentId,
          membershipRole:
            body.role === Role.DEPARTMENT_HEAD
              ? DepartmentMembershipRole.HEAD
              : DepartmentMembershipRole.MASTER,
        })),
      },
    },
    select: staffSelect,
  });
}

export async function updateStaff(id: number, body: UpdateStaffInput) {
  const target = await prisma.user.findFirst({
    where: { id, role: { not: Role.CLIENT } },
  });
  if (!target) throw new AppError(staffMessages.notFound, 404);
  return prisma.user.update({
    where: { id },
    data: {
      ...(body.name && { ipName: body.name }),
      ...(body.email && { email: body.email.toLowerCase() }),
      ...(body.phone && { phone: body.phone }),
      ...(body.status && { status: body.status }),
    },
    select: staffSelect,
  });
}

export async function updateStaffAccess(
  id: number,
  currentUserId: number,
  body: UpdateStaffAccessInput,
) {
  if (id === currentUserId && body.role !== Role.DIRECTOR)
    throw new AppError(staffMessages.selfRole, 400);
  const target = await prisma.user.findFirst({
    where: { id, role: { not: Role.CLIENT } },
  });
  if (!target) throw new AppError(staffMessages.notFound, 404);
  await prisma.$transaction(async (transaction) => {
    await transaction.user.update({ where: { id }, data: { role: body.role } });
    await transaction.userDepartment.deleteMany({ where: { userId: id } });
    if (body.departments.length)
      await transaction.userDepartment.createMany({
        data: body.departments.map((item) => ({ userId: id, ...item })),
      });
    await transaction.userPermission.deleteMany({ where: { userId: id } });
    if (body.permissions.length)
      await transaction.userPermission.createMany({
        data: body.permissions.map((item) => ({ userId: id, ...item })),
      });
  });
  return prisma.user.findUniqueOrThrow({ where: { id }, select: staffSelect });
}

export async function updateStaffPassword(
  id: number,
  body: UpdateStaffPasswordInput,
) {
  const target = await prisma.user.findFirst({
    where: { id, role: { not: Role.CLIENT } },
  });
  if (!target) throw new AppError(staffMessages.notFound, 404);
  await prisma.user.update({
    where: { id },
    data: { passwordHash: await bcrypt.hash(body.password, 12) },
  });
}

export async function createTelegramLink(id: number) {
  const target = await prisma.user.findFirst({
    where: { id, role: { not: Role.CLIENT }, status: UserStatus.ACTIVE },
    select: { id: true, ipName: true },
  });
  if (!target) throw new AppError(staffMessages.activeNotFound, 404);
  const code = randomBytes(18).toString("base64url");
  const expiresAt = new Date(Date.now() + 20 * 60_000);
  await prisma.$transaction([
    prisma.telegramLinkCode.deleteMany({ where: { userId: id, usedAt: null } }),
    prisma.telegramLinkCode.create({ data: { userId: id, code, expiresAt } }),
  ]);
  return {
    employee: target.ipName,
    deepLink: `https://t.me/${config.telegramBotUsername}?start=staff_${code}`,
    expiresAt,
  };
}
