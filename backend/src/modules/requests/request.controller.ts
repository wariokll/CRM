import { RequestStatus, Priority, Role, Urgency } from "@prisma/client";
import type { Request, Response } from "express";
import { getUserAccess } from "../../shared/middleware/authorization.js";
import {
  buildProcurementReport,
  buildRequestReport,
  parseReportPeriod,
} from "./reports.service.js";
import {
  createRequest,
  deleteRequest,
  addRequestComment,
  listRequestAssignees,
  listRequests,
  selfAssignRequest,
  selfUnassignRequest,
  RequestServiceError,
  updateRequest,
} from "./request.service.js";

export async function listAssigneesController(req: Request, res: Response) {
  const access = await getUserAccess(req.auth!.userId);
  if (!access || access.role === Role.CLIENT)
    return res.status(403).json({ message: "Недостаточно прав" });
  const departmentId = Number(req.query.departmentId) || undefined;
  return res.json(await listRequestAssignees(departmentId));
}

export async function listRequestsController(req: Request, res: Response) {
  const access = await getUserAccess(req.auth!.userId);
  if (!access)
    return res.status(401).json({ message: "Пользователь не найден" });
  const urgency =
    req.query.urgency === "URGENT"
      ? Urgency.URGENT
      : req.query.urgency === "SCHEDULED"
        ? Urgency.SCHEDULED
        : undefined;
  const status = Object.values(RequestStatus).includes(
    req.query.status as RequestStatus,
  )
    ? (req.query.status as RequestStatus)
    : undefined;
  const priority = Object.values(Priority).includes(
    req.query.priority as Priority,
  )
    ? (req.query.priority as Priority)
    : undefined;
  const storeId = Number(req.query.storeId) || undefined;
  const typeId = Number(req.query.typeId) || undefined;
  const departmentId = Number(req.query.departmentId) || undefined;
  const search =
    typeof req.query.search === "string" ? req.query.search.trim() : "";
  return res.json(
    await listRequests(access, {
      urgency,
      status,
      priority,
      storeId,
      typeId,
      departmentId,
      search,
    }),
  );
}

export async function requestStatsController(req: Request, res: Response) {
  try {
    const { from, to } = parseReportPeriod(req.query.from, req.query.to);
    res.json(await buildRequestReport(req.access!, from, to));
  } catch (error) {
    res.status(400).json({
      message: error instanceof Error ? error.message : "Некорректный период",
    });
  }
}

export async function procurementReportController(req: Request, res: Response) {
  try {
    const { from, to } = parseReportPeriod(req.query.from, req.query.to);
    const componentId = Number(req.query.componentId) || undefined;
    res.json(await buildProcurementReport(req.access!, from, to, componentId));
  } catch (error) {
    res.status(400).json({
      message: error instanceof Error ? error.message : "Некорректный период",
    });
  }
}

export async function deleteRequestController(req: Request, res: Response) {
  const result = await deleteRequest(
    await getUserAccess(req.auth!.userId),
    Number(req.params.id),
  );
  if (result.status === 204) return res.status(204).end();
  return res.status(result.status).json(result.body);
}

export async function selfAssignRequestController(req: Request, res: Response) {
  const result = await selfAssignRequest(
    await getUserAccess(req.auth!.userId),
    Number(req.params.id),
  );
  if (result.status === 204) return res.status(204).end();
  return res.status(result.status).json(result.body);
}

export async function selfUnassignRequestController(
  req: Request,
  res: Response,
) {
  await selfUnassignRequest(req.auth!.userId, Number(req.params.id));
  return res.status(204).end();
}

export async function addRequestCommentController(req: Request, res: Response) {
  const result = await addRequestComment(
    await getUserAccess(req.auth!.userId),
    Number(req.params.id),
    req.body,
  );
  return res.status(result.status).json(result.body);
}

export async function createRequestController(req: Request, res: Response) {
  try {
    const request = await createRequest(req.auth!.userId, req.body);
    return res.status(201).json(request);
  } catch (error) {
    if (error instanceof RequestServiceError)
      return res.status(error.status).json({ message: error.message });
    throw error;
  }
}

export async function updateRequestController(req: Request, res: Response) {
  try {
    const request = await updateRequest(
      req.auth!.userId,
      Number(req.params.id),
      req.body,
    );
    return res.json(request);
  } catch (error) {
    if (error instanceof RequestServiceError)
      return res.status(error.status).json({ message: error.message });
    throw error;
  }
}
