import { Role } from "@prisma/client";
import type { PrismaClient } from "@prisma/client";
import type {
  CreateRequestTypeInput,
  PatchRequestTypeInput,
} from "./request-types.schemas.js";
import { requestTypeInclude } from "./request-types.mapper.js";

export function createRequestTypesService(prisma: PrismaClient) {
  function listRequestTypes(role: Role) {
    return prisma.requestType.findMany({
      where:
        role === Role.CLIENT ? { isActive: true, availableOnWeb: true } : {},
      include: requestTypeInclude,
      orderBy: { name: "asc" },
    });
  }

  function createRequestType(data: CreateRequestTypeInput) {
    const { componentRequirements, ...requestTypeData } = data;
    return prisma.requestType.create({
      data: {
        ...requestTypeData,
        componentRequirements: { create: componentRequirements },
      },
      include: requestTypeInclude,
    });
  }

  function updateRequestType(id: number, data: PatchRequestTypeInput) {
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

  return { listRequestTypes, createRequestType, updateRequestType };
}
