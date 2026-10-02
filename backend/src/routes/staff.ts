import {
  DepartmentMembershipRole,
  PermissionKey,
  Role,
  UserStatus,
} from "@prisma/client";
import bcrypt from "bcrypt";
import { randomBytes } from "node:crypto";
import { Router } from "express";
import { z } from "zod";
import { prisma } from "../db.js";
import { config } from "../config.js";
import { authenticate } from "../middleware/auth.js";
import { requirePermission } from "../utils/permissions.js";

export const staffRouter = Router();
staffRouter.use(authenticate, requirePermission(PermissionKey.MANAGE_STAFF));

const staffRole = z.enum([Role.DIRECTOR, Role.DEPARTMENT_HEAD, Role.MASTER]);
const staffSelect = {
  id: true,
  ipName: true,
  email: true,
  phone: true,
  role: true,
  status: true,
  createdAt: true,
  departmentMemberships: { include: { department: true } },
  permissionOverrides: true,
  linkedTelegramChats: {
    where: { integration: { kind: "BOT" } },
    select: { id: true, title: true, username: true },
  },
} as const;

staffRouter.get("/", async (_req, res) => {
  res.json(
    await prisma.user.findMany({
      where: { role: { not: Role.CLIENT } },
      select: staffSelect,
      orderBy: [{ role: "asc" }, { ipName: "asc" }],
    }),
  );
});

staffRouter.post("/", async (req, res) => {
  const body = z
    .object({
      name: z.string().trim().min(2).max(200),
      email: z.string().email(),
      phone: z.string().trim().min(5).max(50),
      password: z.string().min(8).max(200),
      role: staffRole,
      departmentIds: z.array(z.number().int().positive()).default([]),
    })
    .parse(req.body);
  const user = await prisma.user.create({
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
  res.status(201).json(user);
});

staffRouter.patch("/:id", async (req, res) => {
  const id = Number(req.params.id);
  const body = z
    .object({
      name: z.string().trim().min(2).max(200).optional(),
      email: z.string().email().optional(),
      phone: z.string().trim().min(5).max(50).optional(),
      status: z.enum([UserStatus.ACTIVE, UserStatus.BLOCKED]).optional(),
    })
    .parse(req.body);
  const target = await prisma.user.findFirst({
    where: { id, role: { not: Role.CLIENT } },
  });
  if (!target) return res.status(404).json({ message: "Сотрудник не найден" });
  res.json(
    await prisma.user.update({
      where: { id },
      data: {
        ...(body.name && { ipName: body.name }),
        ...(body.email && { email: body.email.toLowerCase() }),
        ...(body.phone && { phone: body.phone }),
        ...(body.status && { status: body.status }),
      },
      select: staffSelect,
    }),
  );
});

staffRouter.put("/:id/access", async (req, res) => {
  const id = Number(req.params.id);
  const body = z
    .object({
      role: staffRole,
      departments: z.array(
        z.object({
          departmentId: z.number().int().positive(),
          membershipRole: z.nativeEnum(DepartmentMembershipRole),
        }),
      ),
      permissions: z.array(
        z.object({
          permission: z.nativeEnum(PermissionKey),
          enabled: z.boolean(),
        }),
      ),
    })
    .parse(req.body);
  if (id === req.auth!.userId && body.role !== Role.DIRECTOR)
    return res
      .status(400)
      .json({
        message: "Нельзя снять роль руководителя у собственной учётной записи",
      });
  const target = await prisma.user.findFirst({
    where: { id, role: { not: Role.CLIENT } },
  });
  if (!target) return res.status(404).json({ message: "Сотрудник не найден" });
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
  res.json(
    await prisma.user.findUniqueOrThrow({ where: { id }, select: staffSelect }),
  );
});

staffRouter.patch("/:id/password", async (req, res) => {
  const id = Number(req.params.id);
  const { password } = z
    .object({ password: z.string().min(8).max(200) })
    .parse(req.body);
  const target = await prisma.user.findFirst({
    where: { id, role: { not: Role.CLIENT } },
  });
  if (!target) return res.status(404).json({ message: "Сотрудник не найден" });
  await prisma.user.update({
    where: { id },
    data: { passwordHash: await bcrypt.hash(password, 12) },
  });
  res.status(204).end();
});

staffRouter.post("/:id/telegram-link", async (req, res) => {
  const id = Number(req.params.id);
  const target = await prisma.user.findFirst({
    where: { id, role: { not: Role.CLIENT }, status: UserStatus.ACTIVE },
    select: { id: true, ipName: true },
  });
  if (!target)
    return res.status(404).json({ message: "Активный сотрудник не найден" });
  const code = randomBytes(18).toString("base64url");
  const expiresAt = new Date(Date.now() + 20 * 60_000);
  await prisma.$transaction([
    prisma.telegramLinkCode.deleteMany({ where: { userId: id, usedAt: null } }),
    prisma.telegramLinkCode.create({ data: { userId: id, code, expiresAt } }),
  ]);
  const deepLink = `https://t.me/${config.telegramBotUsername}?start=staff_${code}`;
  res.json({ employee: target.ipName, deepLink, expiresAt });
});
