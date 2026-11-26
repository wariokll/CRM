import type { RequestHandler } from "express";
import type { createStaffService } from "./staff.service.js";
import type {
  CreateStaffInput,
  UpdateStaffAccessInput,
  UpdateStaffInput,
  UpdateStaffPasswordInput,
} from "./staff.schemas.js";

type StaffService = ReturnType<typeof createStaffService>;

export function createStaffControllers(service: StaffService) {
  const listStaffController: RequestHandler = async (_req, res) =>
    res.json(await service.listStaff());

  const createStaffController: RequestHandler = async (req, res) =>
    res
      .status(201)
      .json(await service.createStaff(req.body as CreateStaffInput));

  const updateStaffController: RequestHandler = async (req, res) =>
    res.json(
      await service.updateStaff(
        Number(req.params.id),
        req.body as UpdateStaffInput,
      ),
    );

  const updateStaffAccessController: RequestHandler = async (req, res) =>
    res.json(
      await service.updateStaffAccess(
        Number(req.params.id),
        req.auth!.userId,
        req.body as UpdateStaffAccessInput,
      ),
    );

  const updateStaffPasswordController: RequestHandler = async (req, res) => {
    await service.updateStaffPassword(
      Number(req.params.id),
      req.body as UpdateStaffPasswordInput,
    );
    return res.status(204).end();
  };

  const createTelegramLinkController: RequestHandler = async (req, res) =>
    res.json(await service.createTelegramLink(Number(req.params.id)));

  return {
    listStaffController,
    createStaffController,
    updateStaffController,
    updateStaffAccessController,
    updateStaffPasswordController,
    createTelegramLinkController,
  };
}
