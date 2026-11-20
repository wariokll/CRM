import { api } from "../../api";
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
