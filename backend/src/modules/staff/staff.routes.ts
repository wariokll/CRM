import { PermissionKey } from "@prisma/client";
import type { PrismaClient } from "@prisma/client";
import { Router } from "express";
import { authenticate } from "../../shared/middleware/auth.js";
import { requirePermission } from "../../shared/middleware/authorization.js";
import { validateBody } from "../../shared/middleware/validate.js";
import { createStaffControllers } from "./staff.controller.js";
import { createStaffService } from "./staff.service.js";
import {
  createStaffSchema,
  updateStaffAccessSchema,
  updateStaffPasswordSchema,
  updateStaffSchema,
} from "./staff.schemas.js";

export function createStaffRouter(prisma: PrismaClient) {
  const router = Router();
  const controllers = createStaffControllers(createStaffService(prisma));
  router.use(
    authenticate,
    requirePermission(PermissionKey.MANAGE_STAFF, prisma),
  );
  router.get("/", controllers.listStaffController);
  router.post(
    "/",
    validateBody(createStaffSchema),
    controllers.createStaffController,
  );
  router.patch(
    "/:id",
    validateBody(updateStaffSchema),
    controllers.updateStaffController,
  );
  router.put(
    "/:id/access",
    validateBody(updateStaffAccessSchema),
    controllers.updateStaffAccessController,
  );
  router.patch(
    "/:id/password",
    validateBody(updateStaffPasswordSchema),
    controllers.updateStaffPasswordController,
  );
  router.post("/:id/telegram-link", controllers.createTelegramLinkController);
  return router;
}
