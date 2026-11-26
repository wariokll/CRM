import type { PrismaClient } from "@prisma/client";
import type {
  DepartmentInput,
  DepartmentPatch,
} from "./departments.schemas.js";

export function createDepartmentsService(prisma: PrismaClient) {
  return {
    listDepartments: () =>
      prisma.department.findMany({ orderBy: { name: "asc" } }),
    createDepartment: (data: DepartmentInput) =>
      prisma.department.create({ data }),
    updateDepartment: (id: number, data: DepartmentPatch) =>
      prisma.department.update({ where: { id }, data }),
  };
}
