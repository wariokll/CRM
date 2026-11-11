import { Prisma } from "@prisma/client";
import { prisma } from "../../db.js";
import { AppError } from "../../utils/app-error.js";
import { canAccessBoard } from "./board-policy.js";
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
