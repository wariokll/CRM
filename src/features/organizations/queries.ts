import { api } from "../../api";
import { useMutation } from "@tanstack/react-query";

export function organizationRequest<T = void>(
  path: string,
  init?: RequestInit,
) {
  return api<T>(path, init);
}

export function useOrganizationMutation() {
  return useMutation({
    mutationFn: ({ path, init }: { path: string; init?: RequestInit }) =>
      organizationRequest(path, init),
  });
}
