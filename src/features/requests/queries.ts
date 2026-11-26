import { api } from "../../api";
import { useMutation } from "@tanstack/react-query";
import type { Component, StaffMember } from "../../types";

export function getRequestAssignees(departmentId?: number) {
  const suffix = departmentId ? `?departmentId=${departmentId}` : "";
  return api<StaffMember[]>(`/requests/assignees${suffix}`);
}

export const getRequestComponents = () => api<Component[]>("/components");

export function createRequest(body: Record<string, unknown>) {
  return api("/requests", { method: "POST", body: JSON.stringify(body) });
}

export function updateRequest(id: number, body: Record<string, unknown>) {
  return api(`/requests/${id}`, {
    method: "PATCH",
    body: JSON.stringify(body),
  });
}

export function deleteRequest(id: number) {
  return api(`/requests/${id}`, { method: "DELETE" });
}

export function addRequestComment(
  id: number,
  body: { body: string; visibility: "INTERNAL" | "CLIENT" },
) {
  return api(`/requests/${id}/comments`, {
    method: "POST",
    body: JSON.stringify(body),
  });
}

export function takeRequest(id: number) {
  return api(`/requests/${id}/assignees/self`, { method: "POST" });
}

export function useRequestMutation() {
  return useMutation({
    mutationFn: ({ path, init }: { path: string; init?: RequestInit }) =>
      api(path, init),
  });
}
