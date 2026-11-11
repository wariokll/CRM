import { useCallback } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { can } from "../../auth/permissions";
import { queryKeys } from "../../shared/queryKeys";
import {
  getAppDepartments,
  getAppOrganizations,
  getAppRequestTypes,
  getAppRequests,
  getAppStaff,
  getAppStores,
  getAppTelegramChats,
  getAppTelegramIntegrations,
} from "./queries";
import type { User } from "../../types";

export function useAppData(user: User | null) {
  const queryClient = useQueryClient();
  const userId = user?.id ?? 0;
  const active = user?.status === "ACTIVE";
  const requests = useQuery({
    queryKey: queryKeys.app.requests(userId),
    queryFn: getAppRequests,
    enabled: active,
    refetchInterval: 5_000,
  });
  const stores = useQuery({
    queryKey: queryKeys.app.stores(userId),
    queryFn: getAppStores,
    enabled: active,
    refetchInterval: 5_000,
  });
  const organizations = useQuery({
    queryKey: queryKeys.app.organizations(userId),
    queryFn: getAppOrganizations,
    enabled: active,
    refetchInterval: 5_000,
  });
  const requestTypes = useQuery({
    queryKey: queryKeys.app.requestTypes(userId),
    queryFn: getAppRequestTypes,
    enabled: active,
    refetchInterval: 5_000,
  });
  const departments = useQuery({
    queryKey: queryKeys.app.departments(userId),
    queryFn: getAppDepartments,
    enabled: active,
    refetchInterval: 5_000,
  });
  const staff = useQuery({
    queryKey: queryKeys.app.staff(userId),
    queryFn: getAppStaff,
    enabled: active && user !== null && can(user, "MANAGE_STAFF"),
    refetchInterval: 5_000,
  });
  const integrations = useQuery({
    queryKey: queryKeys.app.telegramIntegrations(userId),
    queryFn: getAppTelegramIntegrations,
    enabled: active && user !== null && can(user, "VIEW_TELEGRAM"),
    refetchInterval: 5_000,
  });
  const chats = useQuery({
    queryKey: queryKeys.app.telegramChats(userId),
    queryFn: getAppTelegramChats,
    enabled: active && user !== null && can(user, "VIEW_TELEGRAM"),
    refetchInterval: 5_000,
  });
  const load = useCallback(async () => {
    await queryClient.invalidateQueries({
      queryKey: queryKeys.app.user(userId),
    });
  }, [queryClient, userId]);
  const error = [
    requests.error,
    stores.error,
    organizations.error,
    requestTypes.error,
    departments.error,
    staff.error,
    integrations.error,
    chats.error,
  ].find(Boolean);

  return {
    requests: requests.data ?? [],
    stores: stores.data ?? [],
    organizations: organizations.data ?? [],
    types: requestTypes.data ?? [],
    departments: departments.data ?? [],
    staff: staff.data ?? [],
    integrations: integrations.data ?? [],
    chats: chats.data ?? [],
    load,
    loadError: error
      ? error instanceof Error
        ? error.message
        : "Ошибка загрузки"
      : "",
  };
}
