import { Router } from "express";
import { authenticate } from "../../shared/middleware/auth.js";
import {
  approveOrganizationController,
  createOrganizationController,
  deleteOrganizationController,
  listOrganizationsController,
  rejectOrganizationController,
  updateOrganizationController,
  updateOrganizationMembersController,
} from "./organizations.controller.js";

export const organizationsRouter = Router();
organizationsRouter.use(authenticate);

organizationsRouter.get("/", listOrganizationsController);
organizationsRouter.post("/", createOrganizationController);
organizationsRouter.patch("/:id", updateOrganizationController);
organizationsRouter.delete("/:id", deleteOrganizationController);
organizationsRouter.put("/:id/members", updateOrganizationMembersController);
organizationsRouter.post("/:id/approve", approveOrganizationController);
organizationsRouter.post("/:id/reject", rejectOrganizationController);
