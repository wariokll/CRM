import type { RequestHandler } from "express";
import {
  createComponent,
  listComponents,
  updateComponent,
} from "./components.service.js";
import type {
  CreateComponentInput,
  UpdateComponentInput,
} from "./components.schemas.js";

export const listComponentsController: RequestHandler = async (_req, res) =>
  res.json(await listComponents());

export const createComponentController: RequestHandler = async (req, res) =>
  res.status(201).json(await createComponent(req.body as CreateComponentInput));

export const updateComponentController: RequestHandler = async (req, res) =>
  res.json(
    await updateComponent(
      Number(req.params.id),
      req.body as UpdateComponentInput,
    ),
  );
