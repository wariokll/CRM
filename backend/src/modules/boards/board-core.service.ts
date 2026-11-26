import type { PrismaClient } from "@prisma/client";
import { BoardType, Prisma, Role } from "@prisma/client";
import { AppError } from "../../shared/errors.js";
import { canAccessBoard, canCreateTeamBoard } from "./board-policy.js";

export function createBoardCoreService(prisma: PrismaClient) {
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

  async function requireBoardOwner(boardId: number, userId: number) {
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

  async function listBoards(type: BoardType, userId: number) {
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

  async function createBoard(
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

  async function serializable<T>(operation: () => Promise<T>) {
    try {
      return await operation();
    } catch (error) {
      if ((error as { code?: string }).code === "P2034")
        throw new AppError("Данные были изменены другим пользователем", 409);
      throw error;
    }
  }
  return {
    findBoard,
    requireBoardOwner,
    loadBoard,
    listBoards,
    createBoard,
    serializable,
  };
}
export type BoardCoreService = ReturnType<typeof createBoardCoreService>;
