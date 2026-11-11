import type { RequestHandler } from "express";
import {
  listPendingOrganizations,
  listPendingStores,
  listPendingUsers,
  updateModeratedOrganization,
  updateModeratedStore,
  updateModeratedUser,
} from "./moderation.service.js";
import type {
  ModerateOrganizationInput,
  ModerateStoreInput,
  ModerateUserInput,
} from "./moderation.schemas.js";

export const listPendingUsersController: RequestHandler = async (_req, res) =>
  res.json(await listPendingUsers());

export const listPendingOrganizationsController: RequestHandler = async (
  _req,
  res,
) => res.json(await listPendingOrganizations());

export const listPendingStoresController: RequestHandler = async (_req, res) =>
  res.json(await listPendingStores());

export const updateModeratedUserController: RequestHandler = async (req, res) =>
  res.json(
    await updateModeratedUser(
      Number(req.params.id),
      req.body as ModerateUserInput,
    ),
  );

export const updateModeratedOrganizationController: RequestHandler = async (
  req,
  res,
) =>
  res.json(
    await updateModeratedOrganization(
      Number(req.params.id),
      req.body as ModerateOrganizationInput,
    ),
  );

export const updateModeratedStoreController: RequestHandler = async (
  req,
  res,
) =>
  res.json(
    await updateModeratedStore(
      Number(req.params.id),
      req.body as ModerateStoreInput,
    ),
  );
