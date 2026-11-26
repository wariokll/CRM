import { PermissionKey } from "@prisma/client";
import type { PrismaClient } from "@prisma/client";
import { Router } from "express";
import { authenticate } from "../../shared/middleware/auth.js";
import { requirePermission } from "../../shared/middleware/authorization.js";
import { validateBody } from "../../shared/middleware/validate.js";
import { createModerationControllers } from "./moderation.controller.js";
import { createModerationService } from "./moderation.service.js";
import {
  moderateOrganizationSchema,
  moderateStoreSchema,
  moderateUserSchema,
} from "./moderation.schemas.js";

export function createModerationRouter(prisma: PrismaClient) {
  const router = Router();
  const controllers = createModerationControllers(
    createModerationService(prisma),
  );
  router.use(
    authenticate,
    requirePermission(PermissionKey.MANAGE_CLIENTS, prisma),
  );
  router.get("/users", controllers.listPendingUsersController);
  router.get("/organizations", controllers.listPendingOrganizationsController);
  router.get("/stores", controllers.listPendingStoresController);
  router.patch(
    "/users/:id",
    validateBody(moderateUserSchema),
    controllers.updateModeratedUserController,
  );
  router.patch(
    "/organizations/:id",
    validateBody(moderateOrganizationSchema),
    controllers.updateModeratedOrganizationController,
  );
  router.patch(
    "/stores/:id",
    validateBody(moderateStoreSchema),
    controllers.updateModeratedStoreController,
  );
  return router;
}
