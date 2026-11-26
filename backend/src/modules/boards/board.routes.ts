import { Role } from "@prisma/client";
import type { PrismaClient } from "@prisma/client";
import type { NextFunction, Request, Response } from "express";
import { Router } from "express";
import { authenticate } from "../../shared/middleware/auth.js";
import { createBoardControllers } from "./board.controller.js";
import { createBoardService } from "./board.service.js";

export function createBoardsRouter(prisma: PrismaClient) {
  const router = Router();
  const controllers = createBoardControllers(createBoardService(prisma));
  router.use(authenticate);
  router.use((req: Request, res: Response, next: NextFunction) => {
    if (req.auth?.role === Role.CLIENT)
      return res.status(403).json({
        message: "Доски доступны только сотрудникам",
      });
    next();
  });

  router.get("/", controllers.listBoardsController);

  router.post("/", controllers.createBoardController);

  router.get("/:boardId", controllers.getBoardController);

  router.get("/:boardId/archive", controllers.listArchivedCardsController);

  router.patch("/:boardId/layout", controllers.updateBoardLayoutController);

  router.post(
    "/cards/:cardId/restore",
    controllers.restoreArchivedCardController,
  );

  router.patch("/:boardId", controllers.renameBoardController);

  router.delete("/:boardId", controllers.deleteBoardController);

  router.get("/:boardId/access", controllers.listBoardAccessController);

  router.post("/:boardId/access", controllers.grantBoardAccessController);

  router.delete(
    "/:boardId/access/:userId",
    controllers.revokeBoardAccessController,
  );

  router.post("/:boardId/columns", controllers.createBoardColumnController);

  router.patch("/columns/:columnId", controllers.updateBoardColumnController);

  router.delete("/columns/:columnId", controllers.deleteBoardColumnController);

  router.post("/columns/:columnId/move", controllers.moveBoardColumnController);

  router.post(
    "/columns/:columnId/cards",
    controllers.createBoardCardController,
  );

  router.patch("/cards/:cardId", controllers.updateBoardCardController);

  router.delete("/cards/:cardId", controllers.deleteBoardCardController);

  router.post("/cards/:cardId/archive", controllers.archiveBoardCardController);

  router.post("/cards/:cardId/move", controllers.moveBoardCardController);

  return router;
}
