import { prisma } from "../../db.js";
import type {
  DepartmentInput,
  DepartmentPatch,
} from "./departments.schemas.js";

export function listDepartments() {
  return prisma.department.findMany({ orderBy: { name: "asc" } });
}

export function createDepartment(data: DepartmentInput) {
  return prisma.department.create({ data });
}

export function updateDepartment(id: number, data: DepartmentPatch) {
  return prisma.department.update({ where: { id }, data });
}
