import { PermissionKey } from "@prisma/client";
import { Router } from "express";
import { authenticate } from "../../shared/middleware/auth.js";
import { requirePermission } from "../../shared/middleware/authorization.js";
import { validateBody } from "../../shared/middleware/validate.js";
import type { PrismaClient } from "@prisma/client";
import { createComponentsControllers } from "./components.controller.js";
import { createComponentsService } from "./components.service.js";
import {
  createComponentSchema,
  updateComponentSchema,
} from "./components.schemas.js";

export function createComponentsRouter(prisma: PrismaClient) {
  const router = Router();
  const controllers = createComponentsControllers(
    createComponentsService(prisma),
  );
  router.use(authenticate);
  router.get("/", controllers.listComponentsController);
  router.post(
    "/",
    requirePermission(PermissionKey.MANAGE_TEMPLATES, prisma),
    validateBody(createComponentSchema),
    controllers.createComponentController,
  );
  router.patch(
    "/:id",
    requirePermission(PermissionKey.MANAGE_TEMPLATES, prisma),
    validateBody(updateComponentSchema),
    controllers.updateComponentController,
  );
  return router;
}
