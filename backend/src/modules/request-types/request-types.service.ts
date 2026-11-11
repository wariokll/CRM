import { Role } from "@prisma/client";
import { prisma } from "../../db.js";
import type {
  CreateRequestTypeInput,
  PatchRequestTypeInput,
} from "./request-types.schemas.js";
import { requestTypeInclude } from "./request-types.mapper.js";

export function listRequestTypes(role: Role) {
  return prisma.requestType.findMany({
    where: role === Role.CLIENT ? { isActive: true, availableOnWeb: true } : {},
    include: requestTypeInclude,
    orderBy: { name: "asc" },
  });
}

export function createRequestType(data: CreateRequestTypeInput) {
  const { componentRequirements, ...requestTypeData } = data;
  return prisma.requestType.create({
    data: {
      ...requestTypeData,
      componentRequirements: { create: componentRequirements },
    },
    include: requestTypeInclude,
  });
}

export function updateRequestType(id: number, data: PatchRequestTypeInput) {
  const { componentRequirements, ...requestTypeData } = data;
  return prisma.requestType.update({
    where: { id },
    data: {
      ...requestTypeData,
      ...(componentRequirements && {
        componentRequirements: {
          deleteMany: {},
          create: componentRequirements,
        },
      }),
    },
    include: requestTypeInclude,
  });
}
