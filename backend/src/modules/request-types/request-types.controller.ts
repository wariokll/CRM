import type { RequestHandler } from "express";
import {
  createRequestType,
  listRequestTypes,
  updateRequestType,
} from "./request-types.service.js";
import type {
  CreateRequestTypeInput,
  PatchRequestTypeInput,
} from "./request-types.schemas.js";

export const listRequestTypesController: RequestHandler = async (req, res) =>
  res.json(await listRequestTypes(req.auth!.role));

export const createRequestTypeController: RequestHandler = async (req, res) =>
  res
    .status(201)
    .json(await createRequestType(req.body as CreateRequestTypeInput));

export const updateRequestTypeController: RequestHandler = async (req, res) =>
  res.json(
    await updateRequestType(
      Number(req.params.id),
      req.body as PatchRequestTypeInput,
    ),
  );
