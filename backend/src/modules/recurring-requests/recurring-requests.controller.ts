import type { RequestHandler } from "express";
import { stopRecurringSchedule } from "./recurring-requests.service.js";

export const stopRecurringScheduleController: RequestHandler = async (
  req,
  res,
) => {
  const result = await stopRecurringSchedule(
    Number(req.params.id),
    req.auth!.userId,
  );
  if (result.status === 204) return res.status(204).end();
  return res.status(result.status).json({ message: result.message });
};
