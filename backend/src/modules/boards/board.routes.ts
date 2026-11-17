import { Role } from "@prisma/client";
import type { NextFunction, Request, Response } from "express";
import { Router } from "express";
import { authenticate } from "../../shared/middleware/auth.js";
import {
  archiveBoardCardController,
  createBoardController,
  createBoardCardController,
  createBoardColumnController,
  deleteBoardController,
  deleteBoardCardController,
  deleteBoardColumnController,
  grantBoardAccessController,
  getBoardController,
  listArchivedCardsController,
  listBoardAccessController,
  listBoardsController,
  moveBoardCardController,
  moveBoardColumnController,
  renameBoardController,
  revokeBoardAccessController,
  restoreArchivedCardController,
  updateBoardCardController,
  updateBoardColumnController,
  updateBoardLayoutController,
} from "./board.controller.js";

export const boardsRouter = Router();
boardsRouter.use(authenticate);
boardsRouter.use((req: Request, res: Response, next: NextFunction) => {
  if (req.auth?.role === Role.CLIENT)
    return res.status(403).json({
      message: "Доски доступны только сотрудникам",
    });
  next();
});

boardsRouter.get("/", listBoardsController);

boardsRouter.post("/", createBoardController);

boardsRouter.get("/:boardId", getBoardController);

boardsRouter.get("/:boardId/archive", listArchivedCardsController);

boardsRouter.patch("/:boardId/layout", updateBoardLayoutController);

boardsRouter.post("/cards/:cardId/restore", restoreArchivedCardController);

boardsRouter.patch("/:boardId", renameBoardController);

boardsRouter.delete("/:boardId", deleteBoardController);

boardsRouter.get("/:boardId/access", listBoardAccessController);

boardsRouter.post("/:boardId/access", grantBoardAccessController);

boardsRouter.delete("/:boardId/access/:userId", revokeBoardAccessController);

boardsRouter.post("/:boardId/columns", createBoardColumnController);

boardsRouter.patch("/columns/:columnId", updateBoardColumnController);

boardsRouter.delete("/columns/:columnId", deleteBoardColumnController);

boardsRouter.post("/columns/:columnId/move", moveBoardColumnController);

boardsRouter.post("/columns/:columnId/cards", createBoardCardController);

boardsRouter.patch("/cards/:cardId", updateBoardCardController);

boardsRouter.delete("/cards/:cardId", deleteBoardCardController);

boardsRouter.post("/cards/:cardId/archive", archiveBoardCardController);

boardsRouter.post("/cards/:cardId/move", moveBoardCardController);
