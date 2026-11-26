import type { Request, Response } from "express";
import {
  OrganizationsServiceError,
  type createOrganizationsService,
} from "./organizations.service.js";

async function sendResult(
  res: Response,
  operation: () => Promise<unknown>,
  status = 200,
) {
  try {
    return res.status(status).json(await operation());
  } catch (error) {
    if (error instanceof OrganizationsServiceError)
      return res.status(error.status).json({ message: error.message });
    throw error;
  }
}

type OrganizationsService = ReturnType<typeof createOrganizationsService>;

export function createOrganizationsControllers(service: OrganizationsService) {
  async function listOrganizationsController(req: Request, res: Response) {
    return sendResult(res, () => service.listOrganizations(req.auth!.userId));
  }

  async function createOrganizationController(req: Request, res: Response) {
    return sendResult(
      res,
      () => service.createOrganization(req.auth!.userId, req.body),
      201,
    );
  }

  async function updateOrganizationController(req: Request, res: Response) {
    return sendResult(res, () =>
      service.updateOrganization(
        Number(req.params.id),
        req.auth!.userId,
        req.body,
      ),
    );
  }

  async function deleteOrganizationController(req: Request, res: Response) {
    try {
      await service.deleteOrganization(Number(req.params.id), req.auth!.userId);
      return res.status(204).end();
    } catch (error) {
      if (error instanceof OrganizationsServiceError)
        return res.status(error.status).json({ message: error.message });
      throw error;
    }
  }

  async function updateOrganizationMembersController(
    req: Request,
    res: Response,
  ) {
    return sendResult(res, () =>
      service.updateOrganizationMembers(
        Number(req.params.id),
        req.auth!.userId,
        req.body,
      ),
    );
  }

  async function approveOrganizationController(req: Request, res: Response) {
    return sendResult(res, () =>
      service.approveOrganization(Number(req.params.id), req.auth!.userId),
    );
  }

  async function rejectOrganizationController(req: Request, res: Response) {
    return sendResult(res, () =>
      service.rejectOrganization(
        Number(req.params.id),
        req.auth!.userId,
        req.body,
      ),
    );
  }

  return {
    listOrganizationsController,
    createOrganizationController,
    updateOrganizationController,
    deleteOrganizationController,
    updateOrganizationMembersController,
    approveOrganizationController,
    rejectOrganizationController,
  };
}
