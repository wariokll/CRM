import type { Priority, RequestStatus, Urgency } from "@prisma/client";

export interface RequestListFilters {
  urgency?: Urgency;
  status?: RequestStatus;
  priority?: Priority;
  storeId?: number;
  typeId?: number;
  departmentId?: number;
  search: string;
}
