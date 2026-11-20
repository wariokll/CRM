import type { Request, Response } from "express";
import {
  approveOrganization,
  createOrganization,
  deleteOrganization,
  listOrganizations,
  OrganizationsServiceError,
  rejectOrganization,
  updateOrganization,
  updateOrganizationMembers,
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

export async function listOrganizationsController(req: Request, res: Response) {
  return sendResult(res, () => listOrganizations(req.auth!.userId));
}

export async function createOrganizationController(
  req: Request,
  res: Response,
) {
  return sendResult(
    res,
    () => createOrganization(req.auth!.userId, req.body),
    201,
  );
}

export async function updateOrganizationController(
  req: Request,
  res: Response,
) {
  return sendResult(res, () =>
    updateOrganization(Number(req.params.id), req.auth!.userId, req.body),
  );
}

export async function deleteOrganizationController(
  req: Request,
  res: Response,
) {
  try {
    await deleteOrganization(Number(req.params.id), req.auth!.userId);
    return res.status(204).end();
  } catch (error) {
    if (error instanceof OrganizationsServiceError)
      return res.status(error.status).json({ message: error.message });
    throw error;
  }
}

export async function updateOrganizationMembersController(
  req: Request,
  res: Response,
) {
  return sendResult(res, () =>
    updateOrganizationMembers(
      Number(req.params.id),
      req.auth!.userId,
      req.body,
    ),
  );
}

export async function approveOrganizationController(
  req: Request,
  res: Response,
) {
  return sendResult(res, () =>
    approveOrganization(Number(req.params.id), req.auth!.userId),
  );
}

export async function rejectOrganizationController(
  req: Request,
  res: Response,
) {
  return sendResult(res, () =>
    rejectOrganization(Number(req.params.id), req.auth!.userId, req.body),
  );
}
