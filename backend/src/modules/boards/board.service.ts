import type { PrismaClient } from "@prisma/client";
import { createBoardArchiveService } from "./board-archive.service.js";
import { createBoardCardsService } from "./board-cards.service.js";
import { createBoardCoreService } from "./board-core.service.js";
import { createBoardStructureService } from "./board-structure.service.js";

export function createBoardService(prisma: PrismaClient) {
  const core = createBoardCoreService(prisma);
  return {
    ...core,
    ...createBoardArchiveService(prisma, core),
    ...createBoardStructureService(prisma, core),
    ...createBoardCardsService(prisma, core),
  };
}
