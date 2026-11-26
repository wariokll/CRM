import { api } from "../../api";
import { useMutation } from "@tanstack/react-query";
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

export function useSaveRequestTypeMutation() {
  return useMutation({
    mutationFn: ({
      id,
      body,
    }: {
      id: number | null;
      body: Record<string, unknown>;
    }) => saveRequestType(id, body),
  });
}

export function useCreateComponentMutation() {
  return useMutation({ mutationFn: createComponent });
}
