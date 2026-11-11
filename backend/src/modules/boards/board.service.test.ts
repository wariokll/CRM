import { beforeEach, describe, expect, it, vi } from "vitest";
import { BoardType, Prisma } from "@prisma/client";
import { boardLayoutSchema, restoreCardSchema } from "./board.contracts.js";

const db = vi.hoisted(() => ({
  board: { findFirst: vi.fn() },
  boardCard: {
    findFirst: vi.fn(),
    findMany: vi.fn(),
    aggregate: vi.fn(),
    updateMany: vi.fn(),
  },
  boardColumn: { findFirst: vi.fn(), updateMany: vi.fn() },
  $transaction: vi.fn(),
}));
vi.mock("../../db.js", () => ({ prisma: db }));
import {
  listArchivedCards,
  restoreArchivedCard,
  updateBoardLayout,
} from "./board.service.js";

beforeEach(() => {
  vi.resetAllMocks();
  db.board.findFirst.mockResolvedValue({
    id: 1,
    ownerId: 10,
    type: BoardType.TEAM,
    accesses: [],
  });
  db.boardCard.findFirst.mockResolvedValue({ column: { boardId: 1 } });
  db.boardColumn.findFirst.mockResolvedValue({ id: 3 });
  db.boardCard.aggregate.mockResolvedValue({ _max: { position: 7 } });
  db.boardCard.updateMany.mockResolvedValue({ count: 1 });
  db.boardColumn.updateMany.mockResolvedValue({ count: 1 });
  db.$transaction.mockImplementation(async (operation) => operation(db));
});

describe("archive access and restoration", () => {
  it("denies listing and restoring cards without board access", async () => {
    await expect(listArchivedCards(1, 99)).rejects.toMatchObject({
      status: 403,
    });
    await expect(
      restoreArchivedCard(5, 99, { version: 2, targetColumnId: 3 }),
    ).rejects.toMatchObject({ status: 403 });
    expect(db.boardCard.findMany).not.toHaveBeenCalled();
    expect(db.$transaction).not.toHaveBeenCalled();
  });

  it("lists only archived, undeleted cards from active columns of the authorized board", async () => {
    db.boardCard.findMany.mockResolvedValue([{ id: 5 }]);
    expect(await listArchivedCards(1, 10)).toEqual([{ id: 5 }]);
    expect(db.boardCard.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: {
          deletedAt: null,
          archivedAt: { not: null },
          column: { boardId: 1, deletedAt: null },
        },
        orderBy: [{ archivedAt: "desc" }, { id: "desc" }],
      }),
    );
  });

  it("appends the restored card after active cards and increments its version", async () => {
    expect(
      await restoreArchivedCard(5, 10, { version: 2, targetColumnId: 3 }),
    ).toBe(1);
    expect(db.boardColumn.findFirst).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { id: 3, boardId: 1, deletedAt: null },
      }),
    );
    expect(db.boardCard.updateMany).toHaveBeenCalledWith({
      where: {
        id: 5,
        version: 2,
        deletedAt: null,
        archivedAt: { not: null },
        column: { boardId: 1, deletedAt: null },
      },
      data: {
        archivedAt: null,
        columnId: 3,
        position: 8,
        version: { increment: 1 },
      },
    });
    expect(db.$transaction).toHaveBeenCalledWith(expect.any(Function), {
      isolationLevel: Prisma.TransactionIsolationLevel.Serializable,
    });
  });

  it("starts at position zero when restoring into an empty column", async () => {
    db.boardCard.aggregate.mockResolvedValue({ _max: { position: null } });
    await restoreArchivedCard(5, 10, { version: 2, targetColumnId: 3 });
    expect(db.boardCard.updateMany).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({ position: 0 }),
      }),
    );
  });

  it("rejects a deleted target or a column belonging to another board", async () => {
    db.boardColumn.findFirst.mockResolvedValue(null);
    await expect(
      restoreArchivedCard(5, 10, { version: 2, targetColumnId: 3 }),
    ).rejects.toMatchObject({ status: 404 });
    expect(db.boardCard.updateMany).not.toHaveBeenCalled();
  });

  it("rejects cards that are deleted, active or already restored", async () => {
    db.boardCard.findFirst.mockResolvedValue(null);
    await expect(
      restoreArchivedCard(5, 10, { version: 2, targetColumnId: 3 }),
    ).rejects.toMatchObject({ status: 404 });
    expect(db.$transaction).not.toHaveBeenCalled();
  });

  it("reports conflicts for stale versions and concurrent database writes", async () => {
    db.boardCard.updateMany.mockResolvedValue({ count: 0 });
    await expect(
      restoreArchivedCard(5, 10, { version: 2, targetColumnId: 3 }),
    ).rejects.toMatchObject({ status: 409 });
    db.$transaction.mockRejectedValue({ code: "P2034" });
    await expect(
      restoreArchivedCard(5, 10, { version: 2, targetColumnId: 3 }),
    ).rejects.toMatchObject({ status: 409 });
  });
});

describe("column layout", () => {
  const columns = [{ id: 3, version: 1, width: 588, cardsPerRow: 3 }];

  it("accepts doubled width with three cards per row and the maximum grid", () => {
    expect(boardLayoutSchema.parse({ columns }).columns).toEqual(columns);
    expect(
      boardLayoutSchema.safeParse({
        columns: [{ ...columns[0], width: 1800, cardsPerRow: 6 }],
      }).success,
    ).toBe(true);
  });

  it.each([
    { width: 239 },
    { width: 1801 },
    { width: 588.5 },
    { cardsPerRow: 0 },
    { cardsPerRow: 7 },
    { cardsPerRow: 1.5 },
    { width: 294, cardsPerRow: 3 },
  ])("rejects invalid dimensions %j", (invalid) => {
    expect(
      boardLayoutSchema.safeParse({ columns: [{ ...columns[0], ...invalid }] })
        .success,
    ).toBe(false);
  });

  it("rejects empty updates and duplicate columns", () => {
    expect(boardLayoutSchema.safeParse({ columns: [] }).success).toBe(false);
    expect(
      boardLayoutSchema.safeParse({ columns: [...columns, ...columns] })
        .success,
    ).toBe(false);
    expect(
      restoreCardSchema.safeParse({ version: 0, targetColumnId: 3 }).success,
    ).toBe(false);
  });

  it("allows authorized members and scopes updates to the board and current version", async () => {
    db.board.findFirst.mockResolvedValue({
      id: 1,
      ownerId: 10,
      type: BoardType.TEAM,
      accesses: [{ userId: 99 }],
    });
    await updateBoardLayout(1, 99, { columns });
    expect(db.boardColumn.updateMany).toHaveBeenCalledWith({
      where: { id: 3, boardId: 1, deletedAt: null, version: 1 },
      data: { width: 588, cardsPerRow: 3, version: { increment: 1 } },
    });
  });

  it("rejects unauthorized layout changes before starting a transaction", async () => {
    await expect(updateBoardLayout(1, 99, { columns })).rejects.toMatchObject({
      status: 403,
    });
    expect(db.$transaction).not.toHaveBeenCalled();
  });

  it("fails the transaction when any column has changed or is outside the board", async () => {
    db.boardColumn.updateMany
      .mockResolvedValueOnce({ count: 1 })
      .mockResolvedValueOnce({ count: 0 });
    await expect(
      updateBoardLayout(1, 10, {
        columns: [...columns, { ...columns[0], id: 4 }],
      }),
    ).rejects.toMatchObject({ status: 409 });
  });
});
