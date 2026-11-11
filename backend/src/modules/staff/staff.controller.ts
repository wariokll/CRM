import type { RequestHandler } from "express";
import {
  createStaff,
  createTelegramLink,
  listStaff,
  updateStaff,
  updateStaffAccess,
  updateStaffPassword,
} from "./staff.service.js";
import type {
  CreateStaffInput,
  UpdateStaffAccessInput,
  UpdateStaffInput,
  UpdateStaffPasswordInput,
} from "./staff.schemas.js";

export const listStaffController: RequestHandler = async (_req, res) =>
  res.json(await listStaff());

export const createStaffController: RequestHandler = async (req, res) =>
  res.status(201).json(await createStaff(req.body as CreateStaffInput));

export const updateStaffController: RequestHandler = async (req, res) =>
  res.json(
    await updateStaff(Number(req.params.id), req.body as UpdateStaffInput),
  );

export const updateStaffAccessController: RequestHandler = async (req, res) =>
  res.json(
    await updateStaffAccess(
      Number(req.params.id),
      req.auth!.userId,
      req.body as UpdateStaffAccessInput,
    ),
  );

export const updateStaffPasswordController: RequestHandler = async (
  req,
  res,
) => {
  await updateStaffPassword(
    Number(req.params.id),
    req.body as UpdateStaffPasswordInput,
  );
  return res.status(204).end();
};

export const createTelegramLinkController: RequestHandler = async (req, res) =>
  res.json(await createTelegramLink(Number(req.params.id)));
