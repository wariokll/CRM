import { RequestStatus } from "@prisma/client";

export const requestStatusTransitions: Record<
  RequestStatus,
  readonly RequestStatus[]
> = {
  NEW: [RequestStatus.ACCEPTED, RequestStatus.DONE, RequestStatus.CANCELLED],
  ACCEPTED: [
    RequestStatus.IN_PROGRESS,
    RequestStatus.DONE,
    RequestStatus.CANCELLED,
  ],
  IN_PROGRESS: [RequestStatus.DONE, RequestStatus.CANCELLED],
  DONE: [],
  CANCELLED: [],
};

export function canChangeRequestStatus(
  from: RequestStatus,
  to: RequestStatus,
): boolean {
  return from === to || requestStatusTransitions[from].includes(to);
}
