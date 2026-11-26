import { PermissionKey } from "@prisma/client";
import { Router } from "express";
import type { PrismaClient } from "@prisma/client";
import { authenticate } from "../../shared/middleware/auth.js";
import { requirePermission } from "../../shared/middleware/authorization.js";
import { validateBody } from "../../shared/middleware/validate.js";
import { createDepartmentsControllers } from "./departments.controller.js";
import { createDepartmentsService } from "./departments.service.js";
import {
  departmentPatchSchema,
  departmentSchema,
} from "./departments.schemas.js";

export function createDepartmentsRouter(prisma: PrismaClient) {
  const router = Router();
  const controllers = createDepartmentsControllers(
    createDepartmentsService(prisma),
  );
  router.use(authenticate);
  router.get("/", controllers.listDepartmentsController);
  router.post(
    "/",
    requirePermission(PermissionKey.MANAGE_STAFF, prisma),
    validateBody(departmentSchema),
    controllers.createDepartmentController,
  );
  router.patch(
    "/:id",
    requirePermission(PermissionKey.MANAGE_STAFF, prisma),
    validateBody(departmentPatchSchema),
    controllers.updateDepartmentController,
  );
  return router;
}
