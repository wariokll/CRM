import { BoardType, Prisma, Role, UserStatus } from "@prisma/client";
import { prisma } from "../../db.js";
import { AppError } from "../../shared/errors.js";
import {
  canAccessBoard,
  canCreateTeamBoard,
  moveItem,
  versionMatches,
} from "./board-policy.js";
import type { BoardLayoutInput, RestoreCardInput } from "./board.contracts.js";

export async function findBoard(boardId: number, userId: number) {
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
  if (
    !canAccessBoard({
      type: board.type,
      ownerId: board.ownerId,
      userId,
      hasExplicitAccess: board.accesses.length > 0,
    })
  )
    throw new AppError("Нет доступа к этой доске", 403);
  return board;
}

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

export async function requireBoardOwner(boardId: number, userId: number) {
  const board = await prisma.board.findFirst({
    where: { id: boardId, deletedAt: null },
    select: { id: true, ownerId: true, type: true },
  });
  if (!board) throw new AppError("Доска не найдена", 404);
  if (board.ownerId !== userId)
    throw new AppError("Только создатель может управлять доской", 403);
  return board;
}

export async function loadBoard(boardId: number, userId: number) {
  await findBoard(boardId, userId);
  const [board, archivedCardCount] = await Promise.all([
    prisma.board.findUniqueOrThrow({
      where: { id: boardId },
      include: boardInclude,
    }),
    prisma.boardCard.count({
      where: {
        deletedAt: null,
        archivedAt: { not: null },
        column: { boardId, deletedAt: null },
      },
    }),
  ]);
  return { ...board, archivedCardCount };
}

export async function listBoards(type: BoardType, userId: number) {
  if (type === BoardType.PERSONAL) {
    const existing = await prisma.board.count({
      where: { type, ownerId: userId, deletedAt: null },
    });
    if (!existing)
      await prisma.board.create({
        data: { name: "Мои задачи", type, ownerId: userId },
      });
  }
  return prisma.board.findMany({
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
}

export async function createBoard(
  input: { name: string; type: BoardType },
  userId: number,
  role: Role,
) {
  if (input.type === BoardType.TEAM && !canCreateTeamBoard(role))
    throw new AppError(
      "Создавать командные доски могут руководитель и начальники отделов",
      403,
    );
  return prisma.$transaction(async (transaction) => {
    const created = await transaction.board.create({
      data: { ...input, ownerId: userId },
    });
    if (input.type === BoardType.TEAM)
      await transaction.boardAccess.create({
        data: { boardId: created.id, userId },
      });
    return created;
  });
}

export async function serializable<T>(operation: () => Promise<T>) {
  try {
    return await operation();
  } catch (error) {
    if ((error as { code?: string }).code === "P2034")
      throw new AppError("Данные были изменены другим пользователем", 409);
    throw error;
  }
}

export async function listArchivedCards(boardId: number, userId: number) {
  await findBoard(boardId, userId);
  return prisma.boardCard.findMany({
    where: {
      deletedAt: null,
      archivedAt: { not: null },
      column: { boardId, deletedAt: null },
    },
    include: { column: { select: { id: true, name: true } } },
    orderBy: [{ archivedAt: "desc" }, { id: "desc" }],
  });
}

export async function restoreArchivedCard(
  cardId: number,
  userId: number,
  input: RestoreCardInput,
) {
  const card = await prisma.boardCard.findFirst({
    where: {
      id: cardId,
      deletedAt: null,
      archivedAt: { not: null },
      column: { deletedAt: null },
    },
    select: { column: { select: { boardId: true } } },
  });
  if (!card) throw new AppError("Карточка в архиве не найдена", 404);
  const boardId = card.column.boardId;
  await findBoard(boardId, userId);
  await serializable(() =>
    prisma.$transaction(
      async (transaction) => {
        const target = await transaction.boardColumn.findFirst({
          where: { id: input.targetColumnId, boardId, deletedAt: null },
          select: { id: true },
        });
        if (!target) throw new AppError("Целевой столбец не найден", 404);
        const aggregate = await transaction.boardCard.aggregate({
          where: { columnId: target.id, deletedAt: null, archivedAt: null },
          _max: { position: true },
        });
        const result = await transaction.boardCard.updateMany({
          where: {
            id: cardId,
            version: input.version,
            deletedAt: null,
            archivedAt: { not: null },
            column: { boardId, deletedAt: null },
          },
          data: {
            archivedAt: null,
            columnId: target.id,
            position: (aggregate._max.position ?? -1) + 1,
            version: { increment: 1 },
          },
        });
        if (!result.count)
          throw new AppError("Данные были изменены другим пользователем", 409);
      },
      { isolationLevel: Prisma.TransactionIsolationLevel.Serializable },
    ),
  );
  return boardId;
}

export async function updateBoardLayout(
  boardId: number,
  userId: number,
  input: BoardLayoutInput,
) {
  await findBoard(boardId, userId);
  await serializable(() =>
    prisma.$transaction(async (transaction) => {
      for (const column of input.columns) {
        const result = await transaction.boardColumn.updateMany({
          where: {
            id: column.id,
            boardId,
            deletedAt: null,
            version: column.version,
          },
          data: {
            width: column.width,
            cardsPerRow: column.cardsPerRow,
            version: { increment: 1 },
          },
        });
        if (!result.count)
          throw new AppError(
            "Столбцы были изменены. Обновите настройки и повторите сохранение",
            409,
          );
      }
    }),
  );
}

export async function renameBoard(
  boardId: number,
  userId: number,
  name: string,
) {
  await requireBoardOwner(boardId, userId);
  return prisma.board.update({ where: { id: boardId }, data: { name } });
}

export async function deleteBoard(boardId: number, userId: number) {
  await requireBoardOwner(boardId, userId);
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
}

export async function listBoardAccess(boardId: number, userId: number) {
  const board = await requireBoardOwner(boardId, userId);
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
  return users.map(({ boardAccesses, ...user }) => ({
    ...user,
    hasAccess: user.id === board.ownerId || boardAccesses.length > 0,
    isOwner: user.id === board.ownerId,
  }));
}

export async function grantBoardAccess(
  boardId: number,
  ownerId: number,
  userId: number,
) {
  const board = await requireBoardOwner(boardId, ownerId);
  if (board.type !== BoardType.TEAM)
    throw new AppError("Доступ настраивается только для командных досок", 400);
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
}

export async function revokeBoardAccess(
  boardId: number,
  ownerId: number,
  userId: number,
) {
  const board = await requireBoardOwner(boardId, ownerId);
  if (userId === board.ownerId)
    throw new AppError("Создатель не может отозвать собственный доступ", 400);
  await prisma.boardAccess.deleteMany({ where: { boardId, userId } });
}

export async function createBoardColumn(
  boardId: number,
  userId: number,
  name: string,
) {
  await findBoard(boardId, userId);
  const aggregate = await prisma.boardColumn.aggregate({
    where: { boardId, deletedAt: null },
    _max: { position: true },
  });
  return prisma.boardColumn.create({
    data: { boardId, name, position: (aggregate._max.position ?? -1) + 1 },
  });
}

export async function updateBoardColumn(
  columnId: number,
  userId: number,
  name: string,
  version: number,
) {
  const column = await prisma.boardColumn.findFirst({
    where: { id: columnId, deletedAt: null },
    select: { boardId: true },
  });
  if (!column) throw new AppError("Столбец не найден", 404);
  await findBoard(column.boardId, userId);
  const result = await prisma.boardColumn.updateMany({
    where: { id: columnId, deletedAt: null, version },
    data: { name, version: { increment: 1 } },
  });
  if (!result.count)
    throw new AppError("Данные были изменены другим пользователем", 409);
  return prisma.boardColumn.findUniqueOrThrow({ where: { id: columnId } });
}

export async function deleteBoardColumn(
  columnId: number,
  userId: number,
  version: number,
) {
  const column = await prisma.boardColumn.findFirst({
    where: { id: columnId, deletedAt: null },
    select: { boardId: true },
  });
  if (!column) throw new AppError("Столбец не найден", 404);
  await findBoard(column.boardId, userId);
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
}

export async function moveBoardColumn(
  columnId: number,
  userId: number,
  position: number,
  version: number,
) {
  const column = await prisma.boardColumn.findFirst({
    where: { id: columnId, deletedAt: null },
    select: { boardId: true },
  });
  if (!column) throw new AppError("Столбец не найден", 404);
  await findBoard(column.boardId, userId);
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
  return column.boardId;
}

export async function createBoardCard(
  columnId: number,
  userId: number,
  input: { title: string; description: string; deadline?: string | null },
) {
  const column = await prisma.boardColumn.findFirst({
    where: { id: columnId, deletedAt: null },
    select: { boardId: true },
  });
  if (!column) throw new AppError("Столбец не найден", 404);
  await findBoard(column.boardId, userId);
  const aggregate = await prisma.boardCard.aggregate({
    where: { columnId, deletedAt: null, archivedAt: null },
    _max: { position: true },
  });
  return prisma.boardCard.create({
    data: {
      columnId,
      title: input.title,
      description: input.description || null,
      deadline: input.deadline
        ? new Date(`${input.deadline}T00:00:00.000Z`)
        : null,
      position: (aggregate._max.position ?? -1) + 1,
    },
  });
}

export async function updateBoardCard(
  cardId: number,
  userId: number,
  input: {
    title: string;
    description: string;
    deadline?: string | null;
    version: number;
  },
) {
  const card = await prisma.boardCard.findFirst({
    where: { id: cardId, deletedAt: null, archivedAt: null },
    select: { column: { select: { boardId: true, deletedAt: true } } },
  });
  if (!card || card.column.deletedAt)
    throw new AppError("Карточка не найдена", 404);
  await findBoard(card.column.boardId, userId);
  const result = await prisma.boardCard.updateMany({
    where: {
      id: cardId,
      deletedAt: null,
      archivedAt: null,
      version: input.version,
    },
    data: {
      title: input.title,
      description: input.description || null,
      deadline: input.deadline
        ? new Date(`${input.deadline}T00:00:00.000Z`)
        : null,
      version: { increment: 1 },
    },
  });
  if (!result.count)
    throw new AppError("Данные были изменены другим пользователем", 409);
  return prisma.boardCard.findUniqueOrThrow({ where: { id: cardId } });
}

export async function deleteBoardCard(
  cardId: number,
  userId: number,
  version: number,
) {
  const card = await prisma.boardCard.findFirst({
    where: { id: cardId, deletedAt: null, archivedAt: null },
    select: { column: { select: { boardId: true, deletedAt: true } } },
  });
  if (!card || card.column.deletedAt)
    throw new AppError("Карточка не найдена", 404);
  await findBoard(card.column.boardId, userId);
  const result = await prisma.boardCard.updateMany({
    where: { id: cardId, deletedAt: null, archivedAt: null, version },
    data: { deletedAt: new Date(), version: { increment: 1 } },
  });
  if (!result.count)
    throw new AppError("Данные были изменены другим пользователем", 409);
}

export async function archiveBoardCard(
  cardId: number,
  userId: number,
  version: number,
) {
  const card = await prisma.boardCard.findFirst({
    where: { id: cardId, deletedAt: null, archivedAt: null },
    select: { column: { select: { boardId: true, deletedAt: true } } },
  });
  if (!card || card.column.deletedAt)
    throw new AppError("Карточка не найдена", 404);
  await findBoard(card.column.boardId, userId);
  const result = await prisma.boardCard.updateMany({
    where: { id: cardId, deletedAt: null, archivedAt: null, version },
    data: { archivedAt: new Date(), version: { increment: 1 } },
  });
  if (!result.count)
    throw new AppError("Данные были изменены другим пользователем", 409);
}

export async function moveBoardCard(
  cardId: number,
  userId: number,
  targetColumnId: number,
  position: number,
  version: number,
) {
  const card = await prisma.boardCard.findFirst({
    where: { id: cardId, deletedAt: null, archivedAt: null },
    select: {
      columnId: true,
      column: { select: { boardId: true, deletedAt: true } },
    },
  });
  if (!card || card.column.deletedAt)
    throw new AppError("Карточка не найдена", 404);
  await findBoard(card.column.boardId, userId);
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
  return card.column.boardId;
}
