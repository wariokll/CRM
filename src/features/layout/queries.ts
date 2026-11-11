import { api } from "../../api";
import type {
  Department,
  Organization,
  RequestType,
  ServiceRequest,
  StaffMember,
  Store,
  TelegramChat,
  TelegramIntegration,
} from "../../types";

export const getAppRequests = () => api<ServiceRequest[]>("/requests");
export const getAppStores = () => api<Store[]>("/stores");
export const getAppOrganizations = () => api<Organization[]>("/organizations");
export const getAppRequestTypes = () => api<RequestType[]>("/request-types");
export const getAppDepartments = () => api<Department[]>("/departments");
export const getAppStaff = () => api<StaffMember[]>("/staff");
export const getAppTelegramIntegrations = () =>
  api<TelegramIntegration[]>("/telegram/integrations");
export const getAppTelegramChats = () => api<TelegramChat[]>("/telegram/chats");
