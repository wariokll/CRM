import { PermissionKey } from "@prisma/client";
import type { PrismaClient } from "@prisma/client";
import { Router } from "express";
import { authenticate } from "../../shared/middleware/auth.js";
import { requirePermission } from "../../shared/middleware/authorization.js";
import { createRequestControllers } from "./request.controller.js";
import { createReportsService } from "./reports.service.js";
import { createRequestService } from "./request.service.js";

export function createRequestsRouter(prisma: PrismaClient) {
  const router = Router();
  const controllers = createRequestControllers(
    prisma,
    createRequestService(prisma),
    createReportsService(prisma),
  );
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
  router.post("/", controllers.createRequestController);
  router.patch("/:id", controllers.updateRequestController);
  router.delete("/:id", controllers.deleteRequestController);
  router.post("/:id/assignees/self", controllers.selfAssignRequestController);
  router.delete(
    "/:id/assignees/self",
    controllers.selfUnassignRequestController,
  );
  router.post("/:id/comments", controllers.addRequestCommentController);
  return router;
}
