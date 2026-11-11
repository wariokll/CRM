import type { RequestHandler } from "express";
import {
  createClient,
  listClients,
  setClientPassword,
  setClientStatus,
} from "./users.service.js";
import type {
  CreateClientInput,
  UpdateClientPasswordInput,
  UpdateClientStatusInput,
} from "./users.schemas.js";

export const listClientsController: RequestHandler = async (req, res) => {
  const search =
    typeof req.query.search === "string" ? req.query.search.trim() : "";
  res.json(await listClients(search));
};

export const createClientController: RequestHandler = async (req, res) =>
  res.status(201).json(await createClient(req.body as CreateClientInput));

export const updateClientStatusController: RequestHandler = async (
  req,
  res,
) => {
  const result = await setClientStatus(
    Number(req.params.id),
    req.body as UpdateClientStatusInput,
  );
  if ("user" in result) return res.json(result.user);
  return res.status(result.status).json({ message: result.message });
};

export const updateClientPasswordController: RequestHandler = async (
  req,
  res,
) => {
  const updated = await setClientPassword(
    Number(req.params.id),
    req.body as UpdateClientPasswordInput,
  );
  if (!updated) return res.status(404).json({ message: "Клиент не найден" });
  return res.status(204).end();
};
