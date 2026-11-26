import { PermissionKey } from "@prisma/client";
import type { PrismaClient } from "@prisma/client";
import { Router } from "express";
import { authenticate } from "../../shared/middleware/auth.js";
import { requirePermission } from "../../shared/middleware/authorization.js";
import { validateBody } from "../../shared/middleware/validate.js";
import { createRequestTypesControllers } from "./request-types.controller.js";
import { createRequestTypesService } from "./request-types.service.js";
import {
  patchRequestTypeSchema,
  requestTypeSchema,
} from "./request-types.schemas.js";

export function createRequestTypesRouter(prisma: PrismaClient) {
  const router = Router();
  const controllers = createRequestTypesControllers(
    createRequestTypesService(prisma),
  );
  router.get("/", authenticate, controllers.listRequestTypesController);
  router.post(
    "/",
    authenticate,
    requirePermission(PermissionKey.MANAGE_TEMPLATES, prisma),
    validateBody(requestTypeSchema),
    controllers.createRequestTypeController,
  );
  router.patch(
    "/:id",
    authenticate,
    requirePermission(PermissionKey.MANAGE_TEMPLATES, prisma),
    validateBody(patchRequestTypeSchema),
    controllers.updateRequestTypeController,
  );
  return router;
}
