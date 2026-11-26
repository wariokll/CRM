import { Prisma } from "@prisma/client";
import type { PrismaClient } from "@prisma/client";
import { AppError } from "../../shared/errors.js";
import type { RestoreCardInput } from "./board.contracts.js";
import type { BoardCoreService } from "./board-core.service.js";

export function createBoardArchiveService(
  prisma: PrismaClient,
  core: BoardCoreService,
) {
  const { findBoard, serializable } = core;
  async function listArchivedCards(boardId: number, userId: number) {
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

  async function restoreArchivedCard(
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
            throw new AppError(
              "Данные были изменены другим пользователем",
              409,
            );
        },
        { isolationLevel: Prisma.TransactionIsolationLevel.Serializable },
      ),
    );
    return boardId;
  }
  return { listArchivedCards, restoreArchivedCard };
}
