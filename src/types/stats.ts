import type {
  Department,
  Organization,
  Priority,
  RequestStatus,
  RequestType,
  Store,
} from "../types";

export interface Stats {
  total: number;
  urgent: number;
  completed: number;
  overdue: number;
  averageResolutionHours: number;
  activeClients: number;
  byStatus: Array<{ status: RequestStatus; _count: { _all: number } }>;
  byType: Array<{
    typeId: number;
    _count: { _all: number };
    type?: Pick<RequestType, "id" | "name" | "color">;
  }>;
  clients: Array<{ id: number; name: string; count: number }>;
  stores: Array<{ id: number; name: string; count: number }>;
  employees: Array<{ id: number; name: string; count: number }>;
  departments: Array<{ id: number; name: string; count: number }>;
  sources: Array<{
    source: "WEB" | "TELEGRAM_ACCOUNT" | "TELEGRAM_BOT";
    count: number;
  }>;
  requests: Array<{
    id: number;
    status: RequestStatus;
    priority: Priority;
    createdAt: string;
    closedAt?: string | null;
    scheduledAt?: string | null;
    source: "WEB" | "TELEGRAM_ACCOUNT" | "TELEGRAM_BOT";
    organization?: Pick<Organization, "id" | "legalName"> | null;
    store?: Pick<Store, "id" | "name"> | null;
    department: Pick<Department, "id" | "name">;
    assignees: string[];
  }>;
}
