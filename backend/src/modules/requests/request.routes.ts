import { PermissionKey } from "@prisma/client";
import { Router } from "express";
import { authenticate } from "../../shared/middleware/auth.js";
import { requirePermission } from "../../shared/middleware/authorization.js";
import {
  createRequestController,
  listAssigneesController,
  listRequestsController,
  procurementReportController,
  requestStatsController,
  deleteRequestController,
  addRequestCommentController,
  selfAssignRequestController,
  selfUnassignRequestController,
  updateRequestController,
} from "./request.controller.js";

export const requestsRouter = Router();
requestsRouter.use(authenticate);

requestsRouter.get("/assignees", listAssigneesController);
requestsRouter.get("/", listRequestsController);

requestsRouter.get(
  "/stats",
  requirePermission(PermissionKey.VIEW_REPORTS),
  requestStatsController,
);

requestsRouter.get(
  "/procurement",
  requirePermission(PermissionKey.VIEW_REPORTS),
  procurementReportController,
);

requestsRouter.post("/", createRequestController);
requestsRouter.patch("/:id", updateRequestController);

requestsRouter.delete("/:id", deleteRequestController);
requestsRouter.post("/:id/assignees/self", selfAssignRequestController);
requestsRouter.delete("/:id/assignees/self", selfUnassignRequestController);

requestsRouter.post("/:id/comments", addRequestCommentController);
