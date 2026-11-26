import { api } from "../../api";
import { useMutation } from "@tanstack/react-query";

export function telegramRequest<T = void>(path: string, init?: RequestInit) {
  return api<T>(path, init);
}

export function useSaveTelegramLinksMutation() {
  return useMutation({
    mutationFn: ({
      chatId,
      organizationIds,
      storeIds,
    }: {
      chatId: number;
      organizationIds: number[];
      storeIds: number[];
    }) =>
      telegramRequest(`/telegram/chats/${chatId}/links`, {
        method: "PUT",
        body: JSON.stringify({ organizationIds, storeIds }),
      }),
  });
}
