import { PermissionKey } from "@prisma/client";
import { Router } from "express";
import { authenticate } from "../../shared/middleware/auth.js";
import { requirePermission } from "../../shared/middleware/authorization.js";
import { validateBody } from "../../shared/middleware/validate.js";
import {
  createDepartmentController,
  listDepartmentsController,
  updateDepartmentController,
} from "./departments.controller.js";
import {
  departmentPatchSchema,
  departmentSchema,
} from "./departments.schemas.js";

export const departmentsRouter = Router();
departmentsRouter.use(authenticate);
departmentsRouter.get("/", listDepartmentsController);
departmentsRouter.post(
  "/",
  requirePermission(PermissionKey.MANAGE_STAFF),
  validateBody(departmentSchema),
  createDepartmentController,
);
departmentsRouter.patch(
  "/:id",
  requirePermission(PermissionKey.MANAGE_STAFF),
  validateBody(departmentPatchSchema),
  updateDepartmentController,
);
