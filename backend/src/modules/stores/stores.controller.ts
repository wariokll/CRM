import type { Request, Response } from "express";
import {
  StoresServiceError,
  type createStoresService,
} from "./stores.service.js";

async function sendResult(
  res: Response,
  operation: () => Promise<unknown>,
  status = 200,
) {
  try {
    return res.status(status).json(await operation());
  } catch (error) {
    if (error instanceof StoresServiceError)
      return res.status(error.status).json({ message: error.message });
    throw error;
  }
}

type StoresService = ReturnType<typeof createStoresService>;

export function createStoresControllers(service: StoresService) {
  async function listStoresController(req: Request, res: Response) {
    return sendResult(res, () => service.listStores(req.auth!.userId));
  }

  async function createStoreController(req: Request, res: Response) {
    return sendResult(
      res,
      () => service.createStore(req.auth!.userId, req.body),
      201,
    );
  }

  async function updateStoreController(req: Request, res: Response) {
    return sendResult(res, () =>
      service.updateStore(Number(req.params.id), req.auth!.userId, req.body),
    );
  }

  async function deleteStoreController(req: Request, res: Response) {
    try {
      await service.deleteStore(Number(req.params.id), req.auth!.userId);
      return res.status(204).end();
    } catch (error) {
      if (error instanceof StoresServiceError)
        return res.status(error.status).json({ message: error.message });
      throw error;
    }
  }

  async function getStoreAccessController(req: Request, res: Response) {
    return sendResult(res, () =>
      service.getStoreAccess(Number(req.params.id), req.auth!.userId),
    );
  }

  async function updateStoreAccessController(req: Request, res: Response) {
    try {
      await service.updateStoreAccess(
        Number(req.params.id),
        req.auth!.userId,
        req.body,
      );
      return res.status(204).end();
    } catch (error) {
      if (error instanceof StoresServiceError)
        return res.status(error.status).json({ message: error.message });
      throw error;
    }
  }

  async function approveStoreController(req: Request, res: Response) {
    return sendResult(res, () =>
      service.approveStore(Number(req.params.id), req.auth!.userId),
    );
  }

  async function rejectStoreController(req: Request, res: Response) {
    return sendResult(res, () =>
      service.rejectStore(Number(req.params.id), req.auth!.userId, req.body),
    );
  }

  return {
    listStoresController,
    createStoreController,
    updateStoreController,
    deleteStoreController,
    getStoreAccessController,
    updateStoreAccessController,
    approveStoreController,
    rejectStoreController,
  };
}
