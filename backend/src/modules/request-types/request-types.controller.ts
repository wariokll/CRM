import type { RequestHandler } from "express";
import type { createRequestTypesService } from "./request-types.service.js";
import type {
  CreateRequestTypeInput,
  PatchRequestTypeInput,
} from "./request-types.schemas.js";

type RequestTypesService = ReturnType<typeof createRequestTypesService>;

export function createRequestTypesControllers(service: RequestTypesService) {
  const listRequestTypesController: RequestHandler = async (req, res) =>
    res.json(await service.listRequestTypes(req.auth!.role));

  const createRequestTypeController: RequestHandler = async (req, res) =>
    res
      .status(201)
      .json(
        await service.createRequestType(req.body as CreateRequestTypeInput),
      );

  const updateRequestTypeController: RequestHandler = async (req, res) =>
    res.json(
      await service.updateRequestType(
        Number(req.params.id),
        req.body as PatchRequestTypeInput,
      ),
    );

  return {
    listRequestTypesController,
    createRequestTypeController,
    updateRequestTypeController,
  };
}
