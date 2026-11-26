import { PermissionKey } from "@prisma/client";
import { Router } from "express";
import type { PrismaClient } from "@prisma/client";
import { authenticate } from "../../shared/middleware/auth.js";
import { requirePermission } from "../../shared/middleware/authorization.js";
import { validateBody } from "../../shared/middleware/validate.js";
import { createUsersControllers } from "./users.controller.js";
import { createUsersService } from "./users.service.js";
import {
  createClientSchema,
  updateClientPasswordSchema,
  updateClientStatusSchema,
} from "./users.schemas.js";

export function createUsersRouter(prisma: PrismaClient) {
  const router = Router();
  const controllers = createUsersControllers(createUsersService(prisma));
  router.use(authenticate, requirePermission(PermissionKey.MANAGE_CLIENTS));
  router.get("/", controllers.listClientsController);
  router.post(
    "/",
    validateBody(createClientSchema),
    controllers.createClientController,
  );
  router.patch(
    "/:id/status",
    validateBody(updateClientStatusSchema),
    controllers.updateClientStatusController,
  );
  router.patch(
    "/:id/password",
    validateBody(updateClientPasswordSchema),
    controllers.updateClientPasswordController,
  );
  return router;
}
