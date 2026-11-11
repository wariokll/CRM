import { api } from "../../api";

export function staffRequest<T = void>(path: string, init?: RequestInit) {
  return api<T>(path, init);
}
