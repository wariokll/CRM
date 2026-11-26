import type { RequestHandler } from "express";
import type { createDepartmentsService } from "./departments.service.js";
import type {
  DepartmentInput,
  DepartmentPatch,
} from "./departments.schemas.js";

type DepartmentsService = ReturnType<typeof createDepartmentsService>;

export function createDepartmentsControllers(service: DepartmentsService) {
  const listDepartmentsController: RequestHandler = async (_req, res) =>
    res.json(await service.listDepartments());

  const createDepartmentController: RequestHandler = async (req, res) =>
    res
      .status(201)
      .json(await service.createDepartment(req.body as DepartmentInput));

  const updateDepartmentController: RequestHandler = async (req, res) =>
    res.json(
      await service.updateDepartment(
        Number(req.params.id),
        req.body as DepartmentPatch,
      ),
    );

  return {
    listDepartmentsController,
    createDepartmentController,
    updateDepartmentController,
  };
}
