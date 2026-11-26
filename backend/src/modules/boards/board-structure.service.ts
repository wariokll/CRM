import { BoardType, Prisma, Role, UserStatus } from "@prisma/client";
import type { BoardAccessUserDTO } from "@crm/shared-types";
import type { PrismaClient } from "@prisma/client";
import { boardAccessUserDtoSchema } from "../../shared/response-schemas.js";
import { AppError } from "../../shared/errors.js";
import { moveItem, versionMatches } from "./board-policy.js";
import type { BoardLayoutInput } from "./board.contracts.js";
import type { BoardCoreService } from "./board-core.service.js";

export function createBoardStructureService(
  prisma: PrismaClient,
  core: BoardCoreService,
) {
  const { findBoard, requireBoardOwner, serializable } = core;
  async function updateBoardLayout(
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

  async function renameBoard(boardId: number, userId: number, name: string) {
    await requireBoardOwner(boardId, userId);
    return prisma.board.update({ where: { id: boardId }, data: { name } });
  }

  async function deleteBoard(boardId: number, userId: number) {
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

  async function listBoardAccess(boardId: number, userId: number) {
    const board = await requireBoardOwner(boardId, userId);
    if (board.type !== BoardType.TEAM)
      throw new AppError(
        "Доступ настраивается только для командных досок",
        400,
      );
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
    return users.map(({ boardAccesses, ...user }) =>
      boardAccessUserDtoSchema.parse({
        ...user,
        hasAccess: user.id === board.ownerId || boardAccesses.length > 0,
        isOwner: user.id === board.ownerId,
      }),
    ) satisfies BoardAccessUserDTO[];
  }

  async function grantBoardAccess(
    boardId: number,
    ownerId: number,
    userId: number,
  ) {
    const board = await requireBoardOwner(boardId, ownerId);
    if (board.type !== BoardType.TEAM)
      throw new AppError(
        "Доступ настраивается только для командных досок",
        400,
      );
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

  async function revokeBoardAccess(
    boardId: number,
    ownerId: number,
    userId: number,
  ) {
    const board = await requireBoardOwner(boardId, ownerId);
    if (userId === board.ownerId)
      throw new AppError("Создатель не может отозвать собственный доступ", 400);
    await prisma.boardAccess.deleteMany({ where: { boardId, userId } });
  }

  async function createBoardColumn(
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

  async function updateBoardColumn(
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

  async function deleteBoardColumn(
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

  async function moveBoardColumn(
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
            throw new AppError(
              "Данные были изменены другим пользователем",
              409,
            );
          const ordered = moveItem(columns, columnId, position);
          for (let index = 0; index < ordered.length; index += 1) {
            const item = ordered[index];
            if (!item) continue;
            if (item.position !== index || item.id === columnId)
              await transaction.boardColumn.update({
                where: { id: item.id },
                data: { position: index, version: { increment: 1 } },
              });
          }
        },
        { isolationLevel: Prisma.TransactionIsolationLevel.Serializable },
      ),
    );
    return column.boardId;
  }
  return {
    updateBoardLayout,
    renameBoard,
    deleteBoard,
    listBoardAccess,
    grantBoardAccess,
    revokeBoardAccess,
    createBoardColumn,
    updateBoardColumn,
    deleteBoardColumn,
    moveBoardColumn,
  };
}
