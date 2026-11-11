import { api } from "../../api";

export function telegramRequest<T = void>(path: string, init?: RequestInit) {
  return api<T>(path, init);
}
