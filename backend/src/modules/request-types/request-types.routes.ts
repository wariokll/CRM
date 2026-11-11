import { PermissionKey } from "@prisma/client";
import { Router } from "express";
import { authenticate } from "../../shared/middleware/auth.js";
import { requirePermission } from "../../shared/middleware/authorization.js";
import { validateBody } from "../../shared/middleware/validate.js";
import {
  createRequestTypeController,
  listRequestTypesController,
  updateRequestTypeController,
} from "./request-types.controller.js";
import {
  patchRequestTypeSchema,
  requestTypeSchema,
} from "./request-types.schemas.js";

export const requestTypesRouter = Router();
requestTypesRouter.get("/", authenticate, listRequestTypesController);
requestTypesRouter.post(
  "/",
  authenticate,
  requirePermission(PermissionKey.MANAGE_TEMPLATES),
  validateBody(requestTypeSchema),
  createRequestTypeController,
);
requestTypesRouter.patch(
  "/:id",
  authenticate,
  requirePermission(PermissionKey.MANAGE_TEMPLATES),
  validateBody(patchRequestTypeSchema),
  updateRequestTypeController,
);
