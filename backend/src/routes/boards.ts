import { BoardType, Prisma, Role, UserStatus } from "@prisma/client";
import type { NextFunction, Request, Response } from "express";
import { Router } from "express";
import { z } from "zod";
import { prisma } from "../db.js";
import { authenticate } from "../middleware/auth.js";
import {
  canAccessBoard,
  canCreateTeamBoard,
  moveItem,
  versionMatches,
} from "../modules/boards/board-policy.js";
import { AppError } from "../utils/app-error.js";

export const boardsRouter = Router();
boardsRouter.use(authenticate);
boardsRouter.use((req: Request, res: Response, next: NextFunction) => {
  if (req.auth?.role === Role.CLIENT)
    return res
      .status(403)
      .json({ message: "Доски доступны только сотрудникам" });
  next();
});

const idSchema = z.coerce.number().int().positive();
const nameSchema = z.string().trim().min(1).max(120);
const titleSchema = z.string().trim().min(1).max(200);
const dateSchema = z
  .string()
  .regex(/^\d{4}-\d{2}-\d{2}$/)
  .refine(
    (value) => !Number.isNaN(Date.parse(`${value}T00:00:00.000Z`)),
    "Некорректная дата",
  );
const versionSchema = z.number().int().positive();

const boardInclude = {
  owner: { select: { id: true, ipName: true } },
  columns: {
    where: { deletedAt: null },
    orderBy: [{ position: "asc" }, { id: "asc" }],
    include: {
      cards: {
        where: { deletedAt: null, archivedAt: null },
        orderBy: [{ position: "asc" }, { id: "asc" }],
      },
    },
  },
} satisfies Prisma.BoardInclude;

async function findBoard(boardId: number, userId: number) {
  const board = await prisma.board.findFirst({
    where: { id: boardId, deletedAt: null },
    select: {
      id: true,
      ownerId: true,
      type: true,
      accesses: { where: { userId }, select: { userId: true } },
    },
  });
  if (!board) throw new AppError("Доска не найдена", 404);
  const allowed = canAccessBoard({
    type: board.type,
    ownerId: board.ownerId,
    userId,
    hasExplicitAccess: board.accesses.length > 0,
  });
  if (!allowed) throw new AppError("Нет доступа к этой доске", 403);
  return board;
}

async function requireOwner(boardId: number, userId: number) {
  const board = await prisma.board.findFirst({
    where: { id: boardId, deletedAt: null },
    select: { id: true, ownerId: true, type: true },
  });
  if (!board) throw new AppError("Доска не найдена", 404);
  if (board.ownerId !== userId)
    throw new AppError("Только создатель может управлять доской", 403);
  return board;
}

async function loadBoard(boardId: number, userId: number) {
  await findBoard(boardId, userId);
  return prisma.board.findUniqueOrThrow({
    where: { id: boardId },
    include: boardInclude,
  });
}

async function serializable<T>(operation: () => Promise<T>) {
  try {
    return await operation();
  } catch (error) {
    if ((error as { code?: string }).code === "P2034")
      throw new AppError("Данные были изменены другим пользователем", 409);
    throw error;
  }
}

boardsRouter.get("/", async (req, res) => {
  const type = z.nativeEnum(BoardType).parse(req.query.type);
  const userId = req.auth!.userId;
  if (type === BoardType.PERSONAL) {
    const existing = await prisma.board.count({
      where: { type, ownerId: userId, deletedAt: null },
    });
    if (!existing)
      await prisma.board.create({
        data: { name: "Мои задачи", type, ownerId: userId },
      });
  }
  const boards = await prisma.board.findMany({
    where:
      type === BoardType.PERSONAL
        ? { type, ownerId: userId, deletedAt: null }
        : {
            type,
            deletedAt: null,
            OR: [{ ownerId: userId }, { accesses: { some: { userId } } }],
          },
    select: {
      id: true,
      name: true,
      type: true,
      ownerId: true,
      createdAt: true,
      updatedAt: true,
      owner: { select: { id: true, ipName: true } },
    },
    orderBy: [{ createdAt: "asc" }, { id: "asc" }],
  });
  res.json(boards);
});

boardsRouter.post("/", async (req, res) => {
  const body = z
    .object({ name: nameSchema, type: z.nativeEnum(BoardType) })
    .parse(req.body);
  if (body.type === BoardType.TEAM && !canCreateTeamBoard(req.auth!.role))
    throw new AppError(
      "Создавать командные доски могут руководитель и начальники отделов",
      403,
    );
  const board = await prisma.$transaction(async (transaction) => {
    const created = await transaction.board.create({
      data: { ...body, ownerId: req.auth!.userId },
    });
    if (body.type === BoardType.TEAM)
      await transaction.boardAccess.create({
        data: { boardId: created.id, userId: req.auth!.userId },
      });
    return created;
  });
  res.status(201).json(board);
});

boardsRouter.get("/:boardId", async (req, res) => {
  res.json(
    await loadBoard(idSchema.parse(req.params.boardId), req.auth!.userId),
  );
});

boardsRouter.patch("/:boardId", async (req, res) => {
  const boardId = idSchema.parse(req.params.boardId);
  await requireOwner(boardId, req.auth!.userId);
  res.json(
    await prisma.board.update({
      where: { id: boardId },
      data: z.object({ name: nameSchema }).parse(req.body),
    }),
  );
});

boardsRouter.delete("/:boardId", async (req, res) => {
  const boardId = idSchema.parse(req.params.boardId);
  await requireOwner(boardId, req.auth!.userId);
  const now = new Date();
  await prisma.$transaction(async (transaction) => {
    const columns = await transaction.boardColumn.findMany({
      where: { boardId, deletedAt: null },
      select: { id: true },
    });
    await transaction.boardCard.updateMany({
      where: {
        columnId: { in: columns.map((item) => item.id) },
        deletedAt: null,
      },
      data: { deletedAt: now, version: { increment: 1 } },
    });
    await transaction.boardColumn.updateMany({
      where: { boardId, deletedAt: null },
      data: { deletedAt: now, version: { increment: 1 } },
    });
    await transaction.board.update({
      where: { id: boardId },
      data: { deletedAt: now },
    });
  });
  res.status(204).end();
});

boardsRouter.get("/:boardId/access", async (req, res) => {
  const boardId = idSchema.parse(req.params.boardId);
  const board = await requireOwner(boardId, req.auth!.userId);
  if (board.type !== BoardType.TEAM)
    throw new AppError("Доступ настраивается только для командных досок", 400);
  const users = await prisma.user.findMany({
    where: { role: { not: Role.CLIENT }, status: UserStatus.ACTIVE },
    select: {
      id: true,
      ipName: true,
      email: true,
      role: true,
      boardAccesses: { where: { boardId }, select: { boardId: true } },
    },
    orderBy: { ipName: "asc" },
  });
  res.json(
    users.map(({ boardAccesses, ...user }) => ({
      ...user,
      hasAccess: user.id === board.ownerId || boardAccesses.length > 0,
      isOwner: user.id === board.ownerId,
    })),
  );
});

boardsRouter.post("/:boardId/access", async (req, res) => {
  const boardId = idSchema.parse(req.params.boardId);
  const board = await requireOwner(boardId, req.auth!.userId);
  if (board.type !== BoardType.TEAM)
    throw new AppError("Доступ настраивается только для командных досок", 400);
  const { userId } = z.object({ userId: idSchema }).parse(req.body);
  const employee = await prisma.user.findFirst({
    where: {
      id: userId,
      role: { not: Role.CLIENT },
      status: UserStatus.ACTIVE,
    },
    select: { id: true },
  });
  if (!employee) throw new AppError("Сотрудник не найден", 404);
  await prisma.boardAccess.upsert({
    where: { boardId_userId: { boardId, userId } },
    create: { boardId, userId },
    update: {},
  });
  res.status(204).end();
});

boardsRouter.delete("/:boardId/access/:userId", async (req, res) => {
  const boardId = idSchema.parse(req.params.boardId);
  const board = await requireOwner(boardId, req.auth!.userId);
  const userId = idSchema.parse(req.params.userId);
  if (userId === board.ownerId)
    throw new AppError("Создатель не может отозвать собственный доступ", 400);
  await prisma.boardAccess.deleteMany({ where: { boardId, userId } });
  res.status(204).end();
});

boardsRouter.post("/:boardId/columns", async (req, res) => {
  const boardId = idSchema.parse(req.params.boardId);
  await findBoard(boardId, req.auth!.userId);
  const { name } = z.object({ name: nameSchema }).parse(req.body);
  const aggregate = await prisma.boardColumn.aggregate({
    where: { boardId, deletedAt: null },
    _max: { position: true },
  });
  const column = await prisma.boardColumn.create({
    data: { boardId, name, position: (aggregate._max.position ?? -1) + 1 },
  });
  res.status(201).json(column);
});

boardsRouter.patch("/columns/:columnId", async (req, res) => {
  const columnId = idSchema.parse(req.params.columnId);
  const body = z
    .object({ name: nameSchema, version: versionSchema })
    .parse(req.body);
  const column = await prisma.boardColumn.findFirst({
    where: { id: columnId, deletedAt: null },
    select: { boardId: true },
  });
  if (!column) throw new AppError("Столбец не найден", 404);
  await findBoard(column.boardId, req.auth!.userId);
  const result = await prisma.boardColumn.updateMany({
    where: { id: columnId, deletedAt: null, version: body.version },
    data: { name: body.name, version: { increment: 1 } },
  });
  if (!result.count)
    throw new AppError("Данные были изменены другим пользователем", 409);
  res.json(
    await prisma.boardColumn.findUniqueOrThrow({ where: { id: columnId } }),
  );
});

boardsRouter.delete("/columns/:columnId", async (req, res) => {
  const columnId = idSchema.parse(req.params.columnId);
  const { version } = z.object({ version: versionSchema }).parse(req.body);
  const column = await prisma.boardColumn.findFirst({
    where: { id: columnId, deletedAt: null },
    select: { boardId: true },
  });
  if (!column) throw new AppError("Столбец не найден", 404);
  await findBoard(column.boardId, req.auth!.userId);
  const now = new Date();
  await prisma.$transaction(async (transaction) => {
    const result = await transaction.boardColumn.updateMany({
      where: { id: columnId, deletedAt: null, version },
      data: { deletedAt: now, version: { increment: 1 } },
    });
    if (!result.count)
      throw new AppError("Данные были изменены другим пользователем", 409);
    await transaction.boardCard.updateMany({
      where: { columnId, deletedAt: null },
      data: { deletedAt: now, version: { increment: 1 } },
    });
  });
  res.status(204).end();
});

boardsRouter.post("/columns/:columnId/move", async (req, res) => {
  const columnId = idSchema.parse(req.params.columnId);
  const { position, version } = z
    .object({ position: z.number().int().min(0), version: versionSchema })
    .parse(req.body);
  const column = await prisma.boardColumn.findFirst({
    where: { id: columnId, deletedAt: null },
    select: { boardId: true },
  });
  if (!column) throw new AppError("Столбец не найден", 404);
  await findBoard(column.boardId, req.auth!.userId);
  await serializable(() =>
    prisma.$transaction(
      async (transaction) => {
        const columns = await transaction.boardColumn.findMany({
          where: { boardId: column.boardId, deletedAt: null },
          orderBy: [{ position: "asc" }, { id: "asc" }],
        });
        const current = columns.find((item) => item.id === columnId);
        if (!current) throw new AppError("Столбец не найден", 404);
        if (!versionMatches(current.version, version))
          throw new AppError("Данные были изменены другим пользователем", 409);
        const ordered = moveItem(columns, columnId, position);
        for (let index = 0; index < ordered.length; index += 1) {
          if (
            ordered[index].position !== index ||
            ordered[index].id === columnId
          )
            await transaction.boardColumn.update({
              where: { id: ordered[index].id },
              data: { position: index, version: { increment: 1 } },
            });
        }
      },
      { isolationLevel: Prisma.TransactionIsolationLevel.Serializable },
    ),
  );
  res.json(await loadBoard(column.boardId, req.auth!.userId));
});

boardsRouter.post("/columns/:columnId/cards", async (req, res) => {
  const columnId = idSchema.parse(req.params.columnId);
  const body = z
    .object({
      title: titleSchema,
      description: z.string().max(5000).optional().default(""),
      deadline: dateSchema.nullable().optional(),
    })
    .parse(req.body);
  const column = await prisma.boardColumn.findFirst({
    where: { id: columnId, deletedAt: null },
    select: { boardId: true },
  });
  if (!column) throw new AppError("Столбец не найден", 404);
  await findBoard(column.boardId, req.auth!.userId);
  const aggregate = await prisma.boardCard.aggregate({
    where: { columnId, deletedAt: null, archivedAt: null },
    _max: { position: true },
  });
  const card = await prisma.boardCard.create({
    data: {
      columnId,
      title: body.title,
      description: body.description || null,
      deadline: body.deadline
        ? new Date(`${body.deadline}T00:00:00.000Z`)
        : null,
      position: (aggregate._max.position ?? -1) + 1,
    },
  });
  res.status(201).json(card);
});

boardsRouter.patch("/cards/:cardId", async (req, res) => {
  const cardId = idSchema.parse(req.params.cardId);
  const body = z
    .object({
      title: titleSchema,
      description: z.string().max(5000).optional().default(""),
      deadline: dateSchema.nullable().optional(),
      version: versionSchema,
    })
    .parse(req.body);
  const card = await prisma.boardCard.findFirst({
    where: { id: cardId, deletedAt: null, archivedAt: null },
    select: { column: { select: { boardId: true, deletedAt: true } } },
  });
  if (!card || card.column.deletedAt)
    throw new AppError("Карточка не найдена", 404);
  await findBoard(card.column.boardId, req.auth!.userId);
  const result = await prisma.boardCard.updateMany({
    where: {
      id: cardId,
      deletedAt: null,
      archivedAt: null,
      version: body.version,
    },
    data: {
      title: body.title,
      description: body.description || null,
      deadline: body.deadline
        ? new Date(`${body.deadline}T00:00:00.000Z`)
        : null,
      version: { increment: 1 },
    },
  });
  if (!result.count)
    throw new AppError("Данные были изменены другим пользователем", 409);
  res.json(await prisma.boardCard.findUniqueOrThrow({ where: { id: cardId } }));
});

boardsRouter.delete("/cards/:cardId", async (req, res) => {
  const cardId = idSchema.parse(req.params.cardId);
  const { version } = z.object({ version: versionSchema }).parse(req.body);
  const card = await prisma.boardCard.findFirst({
    where: { id: cardId, deletedAt: null, archivedAt: null },
    select: { column: { select: { boardId: true, deletedAt: true } } },
  });
  if (!card || card.column.deletedAt)
    throw new AppError("Карточка не найдена", 404);
  await findBoard(card.column.boardId, req.auth!.userId);
  const result = await prisma.boardCard.updateMany({
    where: { id: cardId, deletedAt: null, archivedAt: null, version },
    data: { deletedAt: new Date(), version: { increment: 1 } },
  });
  if (!result.count)
    throw new AppError("Данные были изменены другим пользователем", 409);
  res.status(204).end();
});

boardsRouter.post("/cards/:cardId/archive", async (req, res) => {
  const cardId = idSchema.parse(req.params.cardId);
  const { version } = z.object({ version: versionSchema }).parse(req.body);
  const card = await prisma.boardCard.findFirst({
    where: { id: cardId, deletedAt: null, archivedAt: null },
    select: { column: { select: { boardId: true, deletedAt: true } } },
  });
  if (!card || card.column.deletedAt)
    throw new AppError("Карточка не найдена", 404);
  await findBoard(card.column.boardId, req.auth!.userId);
  const result = await prisma.boardCard.updateMany({
    where: { id: cardId, deletedAt: null, archivedAt: null, version },
    data: { archivedAt: new Date(), version: { increment: 1 } },
  });
  if (!result.count)
    throw new AppError("Данные были изменены другим пользователем", 409);
  res.status(204).end();
});

boardsRouter.post("/cards/:cardId/move", async (req, res) => {
  const cardId = idSchema.parse(req.params.cardId);
  const { targetColumnId, position, version } = z
    .object({
      targetColumnId: idSchema,
      position: z.number().int().min(0),
      version: versionSchema,
    })
    .parse(req.body);
  const card = await prisma.boardCard.findFirst({
    where: { id: cardId, deletedAt: null, archivedAt: null },
    select: {
      columnId: true,
      column: { select: { boardId: true, deletedAt: true } },
    },
  });
  if (!card || card.column.deletedAt)
    throw new AppError("Карточка не найдена", 404);
  await findBoard(card.column.boardId, req.auth!.userId);
  const target = await prisma.boardColumn.findFirst({
    where: {
      id: targetColumnId,
      boardId: card.column.boardId,
      deletedAt: null,
    },
    select: { id: true },
  });
  if (!target) throw new AppError("Целевой столбец не найден", 404);
  await serializable(() =>
    prisma.$transaction(
      async (transaction) => {
        const current = await transaction.boardCard.findFirst({
          where: { id: cardId, deletedAt: null, archivedAt: null },
        });
        if (!current) throw new AppError("Карточка не найдена", 404);
        if (!versionMatches(current.version, version))
          throw new AppError("Данные были изменены другим пользователем", 409);
        const sourceCards = await transaction.boardCard.findMany({
          where: {
            columnId: current.columnId,
            deletedAt: null,
            archivedAt: null,
            id: { not: cardId },
          },
          orderBy: [{ position: "asc" }, { id: "asc" }],
        });
        const destinationCards =
          current.columnId === targetColumnId
            ? sourceCards
            : await transaction.boardCard.findMany({
                where: {
                  columnId: targetColumnId,
                  deletedAt: null,
                  archivedAt: null,
                },
                orderBy: [{ position: "asc" }, { id: "asc" }],
              });
        destinationCards.splice(
          Math.min(position, destinationCards.length),
          0,
          current,
        );
        const affected =
          current.columnId === targetColumnId
            ? destinationCards
            : [...sourceCards, ...destinationCards];
        for (
          let index = 0;
          index < sourceCards.length && current.columnId !== targetColumnId;
          index += 1
        ) {
          await transaction.boardCard.update({
            where: { id: sourceCards[index].id },
            data: { position: index, version: { increment: 1 } },
          });
        }
        const destinationStart =
          current.columnId === targetColumnId ? 0 : sourceCards.length;
        for (
          let index = destinationStart;
          index < affected.length;
          index += 1
        ) {
          const item = affected[index];
          const targetPosition =
            current.columnId === targetColumnId
              ? index
              : index - destinationStart;
          await transaction.boardCard.update({
            where: { id: item.id },
            data: {
              columnId: targetColumnId,
              position: targetPosition,
              version: { increment: 1 },
            },
          });
        }
      },
      { isolationLevel: Prisma.TransactionIsolationLevel.Serializable },
    ),
  );
  res.json(await loadBoard(card.column.boardId, req.auth!.userId));
});
