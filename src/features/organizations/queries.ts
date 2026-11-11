import { api } from "../../api";

export function organizationRequest<T = void>(
  path: string,
  init?: RequestInit,
) {
  return api<T>(path, init);
}
