import type { PrismaClient } from "@prisma/client";
import { createRequestCreationService } from "./request-create.service.js";
import { createRequestReadService } from "./request-read.service.js";
import { createRequestUpdateService } from "./request-update.service.js";
export { RequestServiceError } from "./request.errors.js";
export type { RequestListFilters } from "./request.types.js";

export function createRequestService(prisma: PrismaClient) {
  return {
    ...createRequestReadService(prisma),
    ...createRequestCreationService(prisma),
    ...createRequestUpdateService(prisma),
  };
}
