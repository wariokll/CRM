import { Router } from "express";
import type { PrismaClient } from "@prisma/client";
import { authenticate } from "../../shared/middleware/auth.js";
import { createStoresControllers } from "./stores.controller.js";
import { createStoresService } from "./stores.service.js";

export function createStoresRouter(prisma: PrismaClient) {
  const router = Router();
  const controllers = createStoresControllers(createStoresService(prisma));
  router.use(authenticate);

  router.get("/", controllers.listStoresController);
  router.post("/", controllers.createStoreController);
  router.patch("/:id", controllers.updateStoreController);
  router.delete("/:id", controllers.deleteStoreController);
  router.get("/:id/access", controllers.getStoreAccessController);
  router.put("/:id/access", controllers.updateStoreAccessController);
  router.post("/:id/approve", controllers.approveStoreController);
  router.post("/:id/reject", controllers.rejectStoreController);
  return router;
}
