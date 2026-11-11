import type { Priority, RequestStatus, ServiceRequest } from "../../types";

export const statusLabel: Record<RequestStatus, string> = {
  NEW: "Новая",
  ACCEPTED: "Принята",
  IN_PROGRESS: "В работе",
  DONE: "Выполнена",
  CANCELLED: "Отменена",
};
export const priorityLabel: Record<Priority, string> = {
  LOW: "Низкий",
  NORMAL: "Обычный",
  HIGH: "Высокий",
  CRITICAL: "Критический",
};
export const transitions: Record<RequestStatus, RequestStatus[]> = {
  NEW: ["ACCEPTED", "DONE", "CANCELLED"],
  ACCEPTED: ["IN_PROGRESS", "DONE", "CANCELLED"],
  IN_PROGRESS: ["DONE", "CANCELLED"],
  DONE: [],
  CANCELLED: [],
};

export const isOverdue = (item: ServiceRequest) =>
  Boolean(
    item.scheduledAt &&
    new Date(item.scheduledAt) < new Date() &&
    !["DONE", "CANCELLED"].includes(item.status),
  );
