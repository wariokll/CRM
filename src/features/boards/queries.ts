import { api } from "../../api";

export function boardRequest<T = void>(path: string, init?: RequestInit) {
  return api<T>(path, init);
}
