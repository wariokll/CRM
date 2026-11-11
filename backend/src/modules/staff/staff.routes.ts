import { PermissionKey } from "@prisma/client";
import { Router } from "express";
import { authenticate } from "../../shared/middleware/auth.js";
import { requirePermission } from "../../shared/middleware/authorization.js";
import { validateBody } from "../../shared/middleware/validate.js";
import {
  createStaffController,
  createTelegramLinkController,
  listStaffController,
  updateStaffAccessController,
  updateStaffController,
  updateStaffPasswordController,
} from "./staff.controller.js";
import {
  createStaffSchema,
  updateStaffAccessSchema,
  updateStaffPasswordSchema,
  updateStaffSchema,
} from "./staff.schemas.js";

export const staffRouter = Router();
staffRouter.use(authenticate, requirePermission(PermissionKey.MANAGE_STAFF));
staffRouter.get("/", listStaffController);
staffRouter.post("/", validateBody(createStaffSchema), createStaffController);
staffRouter.patch(
  "/:id",
  validateBody(updateStaffSchema),
  updateStaffController,
);
staffRouter.put(
  "/:id/access",
  validateBody(updateStaffAccessSchema),
  updateStaffAccessController,
);
staffRouter.patch(
  "/:id/password",
  validateBody(updateStaffPasswordSchema),
  updateStaffPasswordController,
);
staffRouter.post("/:id/telegram-link", createTelegramLinkController);
