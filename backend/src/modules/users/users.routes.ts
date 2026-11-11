import { PermissionKey } from "@prisma/client";
import { Router } from "express";
import { authenticate } from "../../shared/middleware/auth.js";
import { requirePermission } from "../../shared/middleware/authorization.js";
import { validateBody } from "../../shared/middleware/validate.js";
import {
  createClientController,
  listClientsController,
  updateClientPasswordController,
  updateClientStatusController,
} from "./users.controller.js";
import {
  createClientSchema,
  updateClientPasswordSchema,
  updateClientStatusSchema,
} from "./users.schemas.js";

export const usersRouter = Router();
usersRouter.use(authenticate, requirePermission(PermissionKey.MANAGE_CLIENTS));
usersRouter.get("/", listClientsController);
usersRouter.post("/", validateBody(createClientSchema), createClientController);
usersRouter.patch(
  "/:id/status",
  validateBody(updateClientStatusSchema),
  updateClientStatusController,
);
usersRouter.patch(
  "/:id/password",
  validateBody(updateClientPasswordSchema),
  updateClientPasswordController,
);
