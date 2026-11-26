import { api } from "../../api";
import { useMutation } from "@tanstack/react-query";

export function staffRequest<T = void>(path: string, init?: RequestInit) {
  return api<T>(path, init);
}

export function useStaffMutation() {
  return useMutation({
    mutationFn: ({ path, init }: { path: string; init?: RequestInit }) =>
      staffRequest(path, init),
  });
}

export function useCreateStaffTelegramLinkMutation() {
  return useMutation({
    mutationFn: (id: number) =>
      staffRequest<{ deepLink: string; expiresAt: string }>(
        `/staff/${id}/telegram-link`,
        { method: "POST" },
      ),
  });
}
