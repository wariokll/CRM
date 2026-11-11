import { PermissionKey } from "@prisma/client";
import { Router } from "express";
import { authenticate } from "../../shared/middleware/auth.js";
import { requirePermission } from "../../shared/middleware/authorization.js";
import { validateBody } from "../../shared/middleware/validate.js";
import {
  createComponentController,
  listComponentsController,
  updateComponentController,
} from "./components.controller.js";
import {
  createComponentSchema,
  updateComponentSchema,
} from "./components.schemas.js";

export const componentsRouter = Router();
componentsRouter.use(authenticate);
componentsRouter.get("/", listComponentsController);
componentsRouter.post(
  "/",
  requirePermission(PermissionKey.MANAGE_TEMPLATES),
  validateBody(createComponentSchema),
  createComponentController,
);
componentsRouter.patch(
  "/:id",
  requirePermission(PermissionKey.MANAGE_TEMPLATES),
  validateBody(updateComponentSchema),
  updateComponentController,
);
