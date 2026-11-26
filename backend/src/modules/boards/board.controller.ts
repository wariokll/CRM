import { BoardType } from "@prisma/client";
import type { Request, Response } from "express";
import { AppError } from "../../shared/errors.js";
import {
  boardIdSchema,
  boardUserAccessSchema,
  columnPositionSchema,
  createBoardSchema,
  createCardSchema,
  boardLayoutSchema,
  moveCardSchema,
  restoreCardSchema,
  updateBoardNameSchema,
  updateCardSchema,
  updateColumnSchema,
  versionBodySchema,
} from "./board.contracts.js";
import type { createBoardService } from "./board.service.js";

export function createBoardControllers(
  service: ReturnType<typeof createBoardService>,
) {
  const {
    archiveBoardCard,
    createBoard,
    createBoardCard,
    createBoardColumn,
    deleteBoard,
    deleteBoardCard,
    deleteBoardColumn,
    findBoard,
    grantBoardAccess,
    listArchivedCards,
    listBoardAccess,
    listBoards,
    loadBoard,
    moveBoardCard,
    moveBoardColumn,
    renameBoard,
    requireBoardOwner,
    restoreArchivedCard,
    revokeBoardAccess,
    updateBoardCard,
    updateBoardColumn,
    updateBoardLayout,
  } = service;

  async function listBoardsController(req: Request, res: Response) {
    const type = createBoardSchema.shape.type.parse(req.query.type);
    return res.json(await listBoards(type, req.auth!.userId));
  }

  async function createBoardController(req: Request, res: Response) {
    const input = createBoardSchema.parse(req.body);
    const board = await createBoard(input, req.auth!.userId, req.auth!.role);
    return res.status(201).json(board);
  }

  async function getBoardController(req: Request, res: Response) {
    return res.json(
      await loadBoard(
        boardIdSchema.parse(req.params.boardId),
        req.auth!.userId,
      ),
    );
  }

  async function listArchivedCardsController(req: Request, res: Response) {
    return res.json(
      await listArchivedCards(
        boardIdSchema.parse(req.params.boardId),
        req.auth!.userId,
      ),
    );
  }

  async function updateBoardLayoutController(req: Request, res: Response) {
    const boardId = boardIdSchema.parse(req.params.boardId);
    await updateBoardLayout(
      boardId,
      req.auth!.userId,
      boardLayoutSchema.parse(req.body),
    );
    return res.json(await loadBoard(boardId, req.auth!.userId));
  }

  async function restoreArchivedCardController(req: Request, res: Response) {
    const boardId = await restoreArchivedCard(
      boardIdSchema.parse(req.params.cardId),
      req.auth!.userId,
      restoreCardSchema.parse(req.body),
    );
    return res.json(await loadBoard(boardId, req.auth!.userId));
  }

  async function renameBoardController(req: Request, res: Response) {
    const boardId = boardIdSchema.parse(req.params.boardId);
    await requireBoardOwner(boardId, req.auth!.userId);
    const { name } = updateBoardNameSchema.parse(req.body);
    return res.json(await renameBoard(boardId, req.auth!.userId, name));
  }

  async function deleteBoardController(req: Request, res: Response) {
    await deleteBoard(
      boardIdSchema.parse(req.params.boardId),
      req.auth!.userId,
    );
    return res.status(204).end();
  }

  async function listBoardAccessController(req: Request, res: Response) {
    return res.json(
      await listBoardAccess(
        boardIdSchema.parse(req.params.boardId),
        req.auth!.userId,
      ),
    );
  }

  async function grantBoardAccessController(req: Request, res: Response) {
    const boardId = boardIdSchema.parse(req.params.boardId);
    const board = await requireBoardOwner(boardId, req.auth!.userId);
    if (board.type !== BoardType.TEAM)
      throw new AppError(
        "Доступ настраивается только для командных досок",
        400,
      );
    const { userId } = boardUserAccessSchema.parse(req.body);
    await grantBoardAccess(boardId, req.auth!.userId, userId);
    return res.status(204).end();
  }

  async function revokeBoardAccessController(req: Request, res: Response) {
    const boardId = boardIdSchema.parse(req.params.boardId);
    await requireBoardOwner(boardId, req.auth!.userId);
    await revokeBoardAccess(
      boardId,
      req.auth!.userId,
      boardIdSchema.parse(req.params.userId),
    );
    return res.status(204).end();
  }

  async function createBoardColumnController(req: Request, res: Response) {
    const boardId = boardIdSchema.parse(req.params.boardId);
    await findBoard(boardId, req.auth!.userId);
    const { name } = updateBoardNameSchema.parse(req.body);
    return res
      .status(201)
      .json(await createBoardColumn(boardId, req.auth!.userId, name));
  }

  async function updateBoardColumnController(req: Request, res: Response) {
    const columnId = boardIdSchema.parse(req.params.columnId);
    const body = updateColumnSchema.parse(req.body);
    return res.json(
      await updateBoardColumn(
        columnId,
        req.auth!.userId,
        body.name,
        body.version,
      ),
    );
  }

  async function deleteBoardColumnController(req: Request, res: Response) {
    const columnId = boardIdSchema.parse(req.params.columnId);
    const { version } = versionBodySchema.parse(req.body);
    await deleteBoardColumn(columnId, req.auth!.userId, version);
    return res.status(204).end();
  }

  async function moveBoardColumnController(req: Request, res: Response) {
    const columnId = boardIdSchema.parse(req.params.columnId);
    const { position, version } = columnPositionSchema.parse(req.body);
    const boardId = await moveBoardColumn(
      columnId,
      req.auth!.userId,
      position,
      version,
    );
    return res.json(await loadBoard(boardId, req.auth!.userId));
  }

  async function createBoardCardController(req: Request, res: Response) {
    const columnId = boardIdSchema.parse(req.params.columnId);
    const input = createCardSchema.parse(req.body);
    return res
      .status(201)
      .json(await createBoardCard(columnId, req.auth!.userId, input));
  }

  async function updateBoardCardController(req: Request, res: Response) {
    const cardId = boardIdSchema.parse(req.params.cardId);
    const input = updateCardSchema.parse(req.body);
    return res.json(await updateBoardCard(cardId, req.auth!.userId, input));
  }

  async function deleteBoardCardController(req: Request, res: Response) {
    const cardId = boardIdSchema.parse(req.params.cardId);
    const { version } = versionBodySchema.parse(req.body);
    await deleteBoardCard(cardId, req.auth!.userId, version);
    return res.status(204).end();
  }

  async function archiveBoardCardController(req: Request, res: Response) {
    const cardId = boardIdSchema.parse(req.params.cardId);
    const { version } = versionBodySchema.parse(req.body);
    await archiveBoardCard(cardId, req.auth!.userId, version);
    return res.status(204).end();
  }

  async function moveBoardCardController(req: Request, res: Response) {
    const cardId = boardIdSchema.parse(req.params.cardId);
    const input = moveCardSchema.parse(req.body);
    const boardId = await moveBoardCard(
      cardId,
      req.auth!.userId,
      input.targetColumnId,
      input.position,
      input.version,
    );
    return res.json(await loadBoard(boardId, req.auth!.userId));
  }

  return {
    listBoardsController,
    createBoardController,
    getBoardController,
    listArchivedCardsController,
    updateBoardLayoutController,
    restoreArchivedCardController,
    renameBoardController,
    deleteBoardController,
    listBoardAccessController,
    grantBoardAccessController,
    revokeBoardAccessController,
    createBoardColumnController,
    updateBoardColumnController,
    deleteBoardColumnController,
    moveBoardColumnController,
    createBoardCardController,
    updateBoardCardController,
    deleteBoardCardController,
    archiveBoardCardController,
    moveBoardCardController,
  };
}
