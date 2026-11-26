import type { RequestHandler } from "express";
import type { createUsersService } from "./users.service.js";
import type {
  CreateClientInput,
  UpdateClientPasswordInput,
  UpdateClientStatusInput,
} from "./users.schemas.js";

type UsersService = ReturnType<typeof createUsersService>;

export function createUsersControllers(service: UsersService) {
  const listClientsController: RequestHandler = async (req, res) => {
    const search =
      typeof req.query.search === "string" ? req.query.search.trim() : "";
    res.json(await service.listClients(search));
  };

  const createClientController: RequestHandler = async (req, res) =>
    res
      .status(201)
      .json(await service.createClient(req.body as CreateClientInput));

  const updateClientStatusController: RequestHandler = async (req, res) => {
    const result = await service.setClientStatus(
      Number(req.params.id),
      req.body as UpdateClientStatusInput,
    );
    if ("user" in result) return res.json(result.user);
    return res.status(result.status).json({ message: result.message });
  };

  const updateClientPasswordController: RequestHandler = async (req, res) => {
    const updated = await service.setClientPassword(
      Number(req.params.id),
      req.body as UpdateClientPasswordInput,
    );
    if (!updated) return res.status(404).json({ message: "Клиент не найден" });
    return res.status(204).end();
  };

  return {
    listClientsController,
    createClientController,
    updateClientPasswordController,
    updateClientStatusController,
  };
}
