import type { RequestHandler } from "express";
import {
  createDepartment,
  listDepartments,
  updateDepartment,
} from "./departments.service.js";
import type {
  DepartmentInput,
  DepartmentPatch,
} from "./departments.schemas.js";

export const listDepartmentsController: RequestHandler = async (_req, res) =>
  res.json(await listDepartments());

export const createDepartmentController: RequestHandler = async (req, res) =>
  res.status(201).json(await createDepartment(req.body as DepartmentInput));

export const updateDepartmentController: RequestHandler = async (req, res) =>
  res.json(
    await updateDepartment(Number(req.params.id), req.body as DepartmentPatch),
  );
