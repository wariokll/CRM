import { api } from "../../api";
import type { Component, Stats } from "../../types";

export type ProcurementRow = {
  componentId: number;
  name: string;
  quantity: number;
  requests: number;
  schedule: Array<{
    requestId: number;
    scheduledAt: string | null;
    organization: string | null;
    store: string | null;
    quantity: number;
  }>;
};

export async function getReportData(
  from: string,
  to: string,
  componentId: string,
) {
  const query = new URLSearchParams({ from, to });
  if (componentId) query.set("componentId", componentId);
  const [stats, procurement] = await Promise.all([
    api<Stats>(`/requests/stats?from=${from}&to=${to}`),
    api<ProcurementRow[]>(`/requests/procurement?${query}`),
  ]);
  return { stats, procurement };
}

export function getComponents() {
  return api<Component[]>("/components");
}
