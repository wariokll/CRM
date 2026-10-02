import {
  OrganizationStatus,
  OrganizationType,
  PermissionKey,
  Role,
  StoreStatus,
  UserStatus,
} from "@prisma/client";
import bcrypt from "bcrypt";
import { Router } from "express";
import { z } from "zod";
import { prisma } from "../db.js";
import { authenticate } from "../middleware/auth.js";
import { requirePermission } from "../utils/permissions.js";

export const usersRouter = Router();
usersRouter.use(authenticate, requirePermission(PermissionKey.MANAGE_CLIENTS));

const createSchema = z.object({
  ipName: z.string().min(2).max(200),
  email: z.string().email(),
  phone: z.string().min(5).max(50),
  password: z.string().min(8).max(200),
  store: z.object({
    name: z.string().min(2).max(200),
    address: z.string().min(5).max(500),
    phone: z.string().max(50).optional(),
  }),
});

usersRouter.get("/", async (req, res) => {
  const search =
    typeof req.query.search === "string" ? req.query.search.trim() : "";
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
  res.json(
    users.map((user) => ({
      ...user,
      stores: user.organizations.flatMap((item) => item.organization.stores),
    })),
  );
});

usersRouter.post("/", async (req, res) => {
  const body = createSchema.parse(req.body);
  const user = await prisma.$transaction(async (transaction) => {
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
  res.status(201).json(user);
});

usersRouter.patch("/:id/status", async (req, res) => {
  const id = Number(req.params.id);
  const body = z
    .object({
      status: z.nativeEnum(UserStatus),
      rejectionReason: z.string().max(1000).nullable().optional(),
    })
    .parse(req.body);
  if (!Number.isInteger(id))
    return res.status(400).json({ message: "Некорректный идентификатор" });
  if (body.status === UserStatus.REJECTED && !body.rejectionReason?.trim())
    return res.status(400).json({ message: "Укажите причину отказа" });
  const user = await prisma.user.findFirst({
    where: { id, role: Role.CLIENT },
  });
  if (!user) return res.status(404).json({ message: "Клиент не найден" });
  res.json(
    await prisma.user.update({
      where: { id },
      data: {
        status: body.status,
        rejectionReason:
          body.status === UserStatus.REJECTED ? body.rejectionReason : null,
      },
    }),
  );
});

usersRouter.patch("/:id/password", async (req, res) => {
  const id = Number(req.params.id);
  const { password } = z
    .object({ password: z.string().min(8).max(200) })
    .parse(req.body);
  const user = await prisma.user.findFirst({
    where: { id, role: Role.CLIENT },
  });
  if (!user) return res.status(404).json({ message: "Клиент не найден" });
  await prisma.user.update({
    where: { id },
    data: { passwordHash: await bcrypt.hash(password, 12) },
  });
  res.status(204).end();
});
