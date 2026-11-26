import type { PrismaClient } from "@prisma/client";
import type {
  CreateComponentInput,
  UpdateComponentInput,
} from "./components.schemas.js";

export function createComponentsService(prisma: PrismaClient) {
  return {
    listComponents: () =>
      prisma.component.findMany({
        orderBy: [{ isActive: "desc" }, { name: "asc" }],
      }),
    createComponent: (data: CreateComponentInput) =>
      prisma.component.create({ data }),
    updateComponent: (id: number, data: UpdateComponentInput) =>
      prisma.component.update({ where: { id }, data }),
  };
}
