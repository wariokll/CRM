import type { Request, Response } from "express";
import {
  approveStore,
  createStore,
  deleteStore,
  getStoreAccess,
  listStores,
  rejectStore,
  StoresServiceError,
  updateStore,
  updateStoreAccess,
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

export async function listStoresController(req: Request, res: Response) {
  return sendResult(res, () => listStores(req.auth!.userId));
}

export async function createStoreController(req: Request, res: Response) {
  return sendResult(res, () => createStore(req.auth!.userId, req.body), 201);
}

export async function updateStoreController(req: Request, res: Response) {
  return sendResult(res, () =>
    updateStore(Number(req.params.id), req.auth!.userId, req.body),
  );
}

export async function deleteStoreController(req: Request, res: Response) {
  try {
    await deleteStore(Number(req.params.id), req.auth!.userId);
    return res.status(204).end();
  } catch (error) {
    if (error instanceof StoresServiceError)
      return res.status(error.status).json({ message: error.message });
    throw error;
  }
}

export async function getStoreAccessController(req: Request, res: Response) {
  return sendResult(res, () =>
    getStoreAccess(Number(req.params.id), req.auth!.userId),
  );
}

export async function updateStoreAccessController(req: Request, res: Response) {
  try {
    await updateStoreAccess(Number(req.params.id), req.auth!.userId, req.body);
    return res.status(204).end();
  } catch (error) {
    if (error instanceof StoresServiceError)
      return res.status(error.status).json({ message: error.message });
    throw error;
  }
}

export async function approveStoreController(req: Request, res: Response) {
  return sendResult(res, () =>
    approveStore(Number(req.params.id), req.auth!.userId),
  );
}

export async function rejectStoreController(req: Request, res: Response) {
  return sendResult(res, () =>
    rejectStore(Number(req.params.id), req.auth!.userId, req.body),
  );
}
