import type { RequestHandler } from "express";
import type { createModerationService } from "./moderation.service.js";
import type {
  ModerateOrganizationInput,
  ModerateStoreInput,
  ModerateUserInput,
} from "./moderation.schemas.js";

export function createModerationControllers(
  service: ReturnType<typeof createModerationService>,
) {
  const listPendingUsersController: RequestHandler = async (_req, res) =>
    res.json(await service.listPendingUsers());

  const listPendingOrganizationsController: RequestHandler = async (
    _req,
    res,
  ) => res.json(await service.listPendingOrganizations());

  const listPendingStoresController: RequestHandler = async (_req, res) =>
    res.json(await service.listPendingStores());

  const updateModeratedUserController: RequestHandler = async (req, res) =>
    res.json(
      await service.updateModeratedUser(
        Number(req.params.id),
        req.body as ModerateUserInput,
      ),
    );

  const updateModeratedOrganizationController: RequestHandler = async (
    req,
    res,
  ) =>
    res.json(
      await service.updateModeratedOrganization(
        Number(req.params.id),
        req.body as ModerateOrganizationInput,
      ),
    );

  const updateModeratedStoreController: RequestHandler = async (req, res) =>
    res.json(
      await service.updateModeratedStore(
        Number(req.params.id),
        req.body as ModerateStoreInput,
      ),
    );

  return {
    listPendingUsersController,
    listPendingOrganizationsController,
    listPendingStoresController,
    updateModeratedUserController,
    updateModeratedOrganizationController,
    updateModeratedStoreController,
  };
}
