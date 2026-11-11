import { api } from "../../api";
import type { Component } from "../../types";

export const getComponents = () => api<Component[]>("/components");

export function saveRequestType(
  id: number | null,
  body: Record<string, unknown>,
) {
  return api(id ? `/request-types/${id}` : "/request-types", {
    method: id ? "PATCH" : "POST",
    body: JSON.stringify(body),
  });
}

export function createComponent(name: string) {
  return api<Component>("/components", {
    method: "POST",
    body: JSON.stringify({ name }),
  });
}
