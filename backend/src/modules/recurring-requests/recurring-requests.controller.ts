import type { RequestHandler } from "express";
import type { createRecurringRequestsService } from "./recurring-requests.service.js";

export function createRecurringRequestsController(
  service: ReturnType<typeof createRecurringRequestsService>,
) {
  const stopRecurringScheduleController: RequestHandler = async (req, res) => {
    const result = await service.stopRecurringSchedule(
      Number(req.params.id),
      req.auth!.userId,
    );
    if (result.status === 204) return res.status(204).end();
    return res.status(result.status).json({ message: result.message });
  };
  return { stopRecurringScheduleController };
}
