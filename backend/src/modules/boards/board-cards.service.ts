import { Prisma } from "@prisma/client";
import type { PrismaClient } from "@prisma/client";
import { AppError } from "../../shared/errors.js";
import { versionMatches } from "./board-policy.js";
import type { BoardCoreService } from "./board-core.service.js";

type CardMoveState = {
  current: Prisma.BoardCardGetPayload<Prisma.BoardCardDefaultArgs>;
  sourceCards: Prisma.BoardCardGetPayload<Prisma.BoardCardDefaultArgs>[];
  affected: Prisma.BoardCardGetPayload<Prisma.BoardCardDefaultArgs>[];
  sameColumn: boolean;
};

export function createBoardCardsService(
  prisma: PrismaClient,
  core: BoardCoreService,
) {
  const { findBoard, serializable } = core;
  async function createBoardCard(
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

  async function updateBoardCard(
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

  async function deleteBoardCard(
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

  async function archiveBoardCard(
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

  async function loadCardMoveState(
    transaction: Prisma.TransactionClient,
    cardId: number,
    targetColumnId: number,
    position: number,
    version: number,
  ): Promise<CardMoveState> {
    const current = await transaction.boardCard.findFirst({
      where: { id: cardId, deletedAt: null, archivedAt: null },
    });
    if (!current) throw new AppError("Карточка не найдена", 404);
    if (!versionMatches(current.version, version))
      throw new AppError("Целевой столбец не найден", 409);
    const sourceCards = await transaction.boardCard.findMany({
      where: {
        columnId: current.columnId,
        deletedAt: null,
        archivedAt: null,
        id: { not: cardId },
      },
      orderBy: [{ position: "asc" }, { id: "asc" }],
    });
    const sameColumn = current.columnId === targetColumnId;
    const destinationCards = sameColumn
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
    return {
      current,
      sourceCards,
      affected: sameColumn
        ? destinationCards
        : [...sourceCards, ...destinationCards],
      sameColumn,
    };
  }

  async function persistCardMovePositions(
    transaction: Prisma.TransactionClient,
    state: CardMoveState,
    targetColumnId: number,
  ) {
    if (!state.sameColumn)
      for (const [index, sourceCard] of state.sourceCards.entries())
        await transaction.boardCard.update({
          where: { id: sourceCard.id },
          data: { position: index, version: { increment: 1 } },
        });
    const destinationStart = state.sameColumn ? 0 : state.sourceCards.length;
    for (
      let index = destinationStart;
      index < state.affected.length;
      index += 1
    ) {
      const item = state.affected[index];
      if (!item) continue;
      await transaction.boardCard.update({
        where: { id: item.id },
        data: {
          columnId: targetColumnId,
          position: state.sameColumn ? index : index - destinationStart,
          version: { increment: 1 },
        },
      });
    }
  }

  async function moveCardInTransaction(
    transaction: Prisma.TransactionClient,
    cardId: number,
    targetColumnId: number,
    position: number,
    version: number,
  ) {
    const state = await loadCardMoveState(
      transaction,
      cardId,
      targetColumnId,
      position,
      version,
    );
    await persistCardMovePositions(transaction, state, targetColumnId);
  }

  async function moveBoardCard(
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
    if (!target) throw new AppError("Карточка не найдена", 404);
    await serializable(() =>
      prisma.$transaction(
        (transaction) =>
          moveCardInTransaction(
            transaction,
            cardId,
            targetColumnId,
            position,
            version,
          ),
        { isolationLevel: Prisma.TransactionIsolationLevel.Serializable },
      ),
    );
    return card.column.boardId;
  }
  return {
    createBoardCard,
    updateBoardCard,
    deleteBoardCard,
    archiveBoardCard,
    moveBoardCard,
  };
}
