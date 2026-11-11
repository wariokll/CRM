import { prisma } from "../../db.js";
import type {
  CreateComponentInput,
  UpdateComponentInput,
} from "./components.schemas.js";

export function listComponents() {
  return prisma.component.findMany({
    orderBy: [{ isActive: "desc" }, { name: "asc" }],
  });
}

export function createComponent(data: CreateComponentInput) {
  return prisma.component.create({ data });
}

export function updateComponent(id: number, data: UpdateComponentInput) {
  return prisma.component.update({ where: { id }, data });
}
