import { PermissionKey } from "@prisma/client";
import { Router } from "express";
import { authenticate } from "../../shared/middleware/auth.js";
import { requirePermission } from "../../shared/middleware/authorization.js";
import { validateBody } from "../../shared/middleware/validate.js";
import {
  listPendingOrganizationsController,
  listPendingStoresController,
  listPendingUsersController,
  updateModeratedOrganizationController,
  updateModeratedStoreController,
  updateModeratedUserController,
} from "./moderation.controller.js";
import {
  moderateOrganizationSchema,
  moderateStoreSchema,
  moderateUserSchema,
} from "./moderation.schemas.js";

export const moderationRouter = Router();
moderationRouter.use(
  authenticate,
  requirePermission(PermissionKey.MANAGE_CLIENTS),
);
moderationRouter.get("/users", listPendingUsersController);
moderationRouter.get("/organizations", listPendingOrganizationsController);
moderationRouter.get("/stores", listPendingStoresController);
moderationRouter.patch(
  "/users/:id",
  validateBody(moderateUserSchema),
  updateModeratedUserController,
);
moderationRouter.patch(
  "/organizations/:id",
  validateBody(moderateOrganizationSchema),
  updateModeratedOrganizationController,
);
moderationRouter.patch(
  "/stores/:id",
  validateBody(moderateStoreSchema),
  updateModeratedStoreController,
);
