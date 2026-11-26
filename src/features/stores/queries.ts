import { api } from "../../api";
import { useMutation } from "@tanstack/react-query";
import type { StoreAccess } from "../../types";

export function storeRequest<T = void>(path: string, init?: RequestInit) {
  return api<T>(path, init);
}

export function getStoreAccess(storeId: number) {
  return storeRequest<StoreAccess | null>(`/stores/${storeId}/access`);
}

export function saveStoreAccess(
  storeId: number,
  values: Record<string, string>,
) {
  return storeRequest(`/stores/${storeId}/access`, {
    method: "PUT",
    body: JSON.stringify(values),
  });
}

export function useStoreMutation() {
  return useMutation({
    mutationFn: ({ path, init }: { path: string; init?: RequestInit }) =>
      storeRequest(path, init),
  });
}

export function useSaveStoreAccessMutation() {
  return useMutation({
    mutationFn: ({
      storeId,
      values,
    }: {
      storeId: number;
      values: Record<string, string>;
    }) => saveStoreAccess(storeId, values),
  });
}
