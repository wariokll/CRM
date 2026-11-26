import { RequestStatus, Priority, Role, Urgency } from "@prisma/client";
import type { PrismaClient } from "@prisma/client";
import type { RequestHandler } from "express";
import { getUserAccess } from "../../shared/middleware/authorization.js";
import { parseReportPeriod } from "./reports.service.js";
import { RequestServiceError } from "./request.service.js";
import type { createRequestService as CreateRequestService } from "./request.service.js";
import type { createReportsService as CreateReportsService } from "./reports.service.js";

type RequestService = ReturnType<typeof CreateRequestService>;
type ReportsService = ReturnType<typeof CreateReportsService>;

export function createRequestControllers(
  prisma: PrismaClient,
  requests: RequestService,
  reports: ReportsService,
) {
  const listAssigneesController: RequestHandler = async (req, res) => {
    const access = await getUserAccess(req.auth!.userId, prisma);
    if (!access || access.role === Role.CLIENT)
      return res.status(403).json({ message: "Недостаточно прав" });
    const departmentId = Number(req.query.departmentId) || undefined;
    return res.json(await requests.listRequestAssignees(departmentId));
  };

  const listRequestsController: RequestHandler = async (req, res) => {
    const access = await getUserAccess(req.auth!.userId, prisma);
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
      await requests.listRequests(access, {
        urgency,
        status,
        priority,
        storeId,
        typeId,
        departmentId,
        search,
      }),
    );
  };

  const requestStatsController: RequestHandler = async (req, res) => {
    try {
      const { from, to } = parseReportPeriod(req.query.from, req.query.to);
      res.json(await reports.buildRequestReport(req.access!, from, to));
    } catch (error) {
      res.status(400).json({
        message: error instanceof Error ? error.message : "Некорректный период",
      });
    }
  };

  const procurementReportController: RequestHandler = async (req, res) => {
    try {
      const { from, to } = parseReportPeriod(req.query.from, req.query.to);
      const componentId = Number(req.query.componentId) || undefined;
      res.json(
        await reports.buildProcurementReport(
          req.access!,
          from,
          to,
          componentId,
        ),
      );
    } catch (error) {
      res.status(400).json({
        message: error instanceof Error ? error.message : "Некорректный период",
      });
    }
  };

  const deleteRequestController: RequestHandler = async (req, res) => {
    const result = await requests.deleteRequest(
      await getUserAccess(req.auth!.userId, prisma),
      Number(req.params.id),
    );
    if (result.status === 204) return res.status(204).end();
    return res.status(result.status).json(result.body);
  };

  const selfAssignRequestController: RequestHandler = async (req, res) => {
    const result = await requests.selfAssignRequest(
      await getUserAccess(req.auth!.userId, prisma),
      Number(req.params.id),
    );
    if (result.status === 204) return res.status(204).end();
    return res.status(result.status).json(result.body);
  };

  const selfUnassignRequestController: RequestHandler = async (req, res) => {
    await requests.selfUnassignRequest(req.auth!.userId, Number(req.params.id));
    return res.status(204).end();
  };

  const addRequestCommentController: RequestHandler = async (req, res) => {
    const result = await requests.addRequestComment(
      await getUserAccess(req.auth!.userId, prisma),
      Number(req.params.id),
      req.body,
    );
    return res.status(result.status).json(result.body);
  };

  const createRequestController: RequestHandler = async (req, res) => {
    try {
      const request = await requests.createRequest(req.auth!.userId, req.body);
      return res.status(201).json(request);
    } catch (error) {
      if (error instanceof RequestServiceError)
        return res.status(error.status).json({ message: error.message });
      throw error;
    }
  };

  const updateRequestController: RequestHandler = async (req, res) => {
    try {
      const request = await requests.updateRequest(
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
  };

  return {
    listAssigneesController,
    listRequestsController,
    procurementReportController,
    requestStatsController,
    deleteRequestController,
    selfAssignRequestController,
    selfUnassignRequestController,
    addRequestCommentController,
    createRequestController,
    updateRequestController,
  };
}
