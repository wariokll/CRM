import { api } from "../../api";

export function storeRequest<T = void>(path: string, init?: RequestInit) {
  return api<T>(path, init);
}
