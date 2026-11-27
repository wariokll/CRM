import { PermissionKey } from "@prisma/client";
import type { PrismaClient } from "@prisma/client";
import { Router, type RequestHandler } from "express";
import { authenticate } from "../../shared/middleware/auth.js";
import { requirePermission } from "../../shared/middleware/authorization.js";
import { validateBody } from "../../shared/middleware/validate.js";
import { createRequestControllers } from "./request.controller.js";
import { createReportsService } from "./reports.service.js";
import { RequestServiceError } from "./request.errors.js";
import {
  createRequestSchema,
  updateRequestSchema,
} from "./request.contracts.js";
import { createRequestService } from "./request.service.js";

export function createRequestsRouter(prisma: PrismaClient) {
  const router = Router();
  const requests = createRequestService(prisma);
  const controllers = createRequestControllers(
    prisma,
    requests,
    createReportsService(prisma),
  );
  const prepareRequestUpdate: RequestHandler = async (req, res, next) => {
    try {
      res.locals.requestUpdateContext = await requests.prepareRequestUpdate(
        req.auth!.userId,
        Number(req.params.id),
      );
      next();
    } catch (error) {
      if (error instanceof RequestServiceError)
        return res.status(error.status).json({ message: error.message });
      next(error);
    }
  };
  router.use(authenticate);

  router.get("/assignees", controllers.listAssigneesController);
  router.get("/", controllers.listRequestsController);
  router.get(
    "/stats",
    requirePermission(PermissionKey.VIEW_REPORTS, prisma),
    controllers.requestStatsController,
  );
  router.get(
    "/procurement",
    requirePermission(PermissionKey.VIEW_REPORTS, prisma),
    controllers.procurementReportController,
  );
  router.post(
    "/",
    validateBody(createRequestSchema),
    controllers.createRequestController,
  );
  router.patch(
    "/:id",
    prepareRequestUpdate,
    validateBody(updateRequestSchema),
    controllers.updateRequestController,
  );
  router.delete("/:id", controllers.deleteRequestController);
  router.post("/:id/assignees/self", controllers.selfAssignRequestController);
  router.delete(
    "/:id/assignees/self",
    controllers.selfUnassignRequestController,
  );
  router.post("/:id/comments", controllers.addRequestCommentController);
  return router;
}
