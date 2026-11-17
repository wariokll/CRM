import { Router } from "express";
import { authenticate } from "../../shared/middleware/auth.js";
import {
  approveStoreController,
  createStoreController,
  deleteStoreController,
  getStoreAccessController,
  listStoresController,
  rejectStoreController,
  updateStoreAccessController,
  updateStoreController,
} from "./stores.controller.js";

export const storesRouter = Router();
storesRouter.use(authenticate);

storesRouter.get("/", listStoresController);
storesRouter.post("/", createStoreController);
storesRouter.patch("/:id", updateStoreController);
storesRouter.delete("/:id", deleteStoreController);
storesRouter.get("/:id/access", getStoreAccessController);
storesRouter.put("/:id/access", updateStoreAccessController);
storesRouter.post("/:id/approve", approveStoreController);
storesRouter.post("/:id/reject", rejectStoreController);
