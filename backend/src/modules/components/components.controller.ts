import type { RequestHandler } from "express";
import type { createComponentsService } from "./components.service.js";
import type {
  CreateComponentInput,
  UpdateComponentInput,
} from "./components.schemas.js";

type ComponentsService = ReturnType<typeof createComponentsService>;

export function createComponentsControllers(service: ComponentsService) {
  const listComponentsController: RequestHandler = async (_req, res) =>
    res.json(await service.listComponents());

  const createComponentController: RequestHandler = async (req, res) =>
    res
      .status(201)
      .json(await service.createComponent(req.body as CreateComponentInput));

  const updateComponentController: RequestHandler = async (req, res) =>
    res.json(
      await service.updateComponent(
        Number(req.params.id),
        req.body as UpdateComponentInput,
      ),
    );

  return {
    listComponentsController,
    createComponentController,
    updateComponentController,
  };
}
