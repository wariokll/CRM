import { Router } from "express";
import type { PrismaClient } from "@prisma/client";
import { authenticate } from "../../shared/middleware/auth.js";
import { createOrganizationsControllers } from "./organizations.controller.js";
import { createOrganizationsService } from "./organizations.service.js";

export function createOrganizationsRouter(prisma: PrismaClient) {
  const router = Router();
  const controllers = createOrganizationsControllers(
    createOrganizationsService(prisma),
  );
  router.use(authenticate);

  router.get("/", controllers.listOrganizationsController);
  router.post("/", controllers.createOrganizationController);
  router.patch("/:id", controllers.updateOrganizationController);
  router.delete("/:id", controllers.deleteOrganizationController);
  router.put("/:id/members", controllers.updateOrganizationMembersController);
  router.post("/:id/approve", controllers.approveOrganizationController);
  router.post("/:id/reject", controllers.rejectOrganizationController);
  return router;
}
