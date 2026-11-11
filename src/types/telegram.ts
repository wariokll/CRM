import type { Organization, Store, User } from "../types";

export interface TelegramIntegration {
  id: number;
  kind: "USER_ACCOUNT" | "BOT";
  status:
    "DISABLED" | "NEEDS_CONFIGURATION" | "CONNECTING" | "ACTIVE" | "ERROR";
  displayName?: string | null;
  lastError?: string | null;
}
export interface TelegramChat {
  id: number;
  title: string;
  username?: string | null;
  unreadCount: number;
  lastMessageAt?: string | null;
  integration: TelegramIntegration;
  organization?: Organization | null;
  store?: Store | null;
  organizationLinks: Array<{
    organization: Pick<Organization, "id" | "legalName">;
  }>;
  storeLinks: Array<{
    store: Pick<Store, "id" | "name" | "address" | "organizationId">;
  }>;
  linkedUser?: Pick<User, "id" | "ipName" | "email"> | null;
  messages: Array<{ body?: string | null; sentAt: string }>;
}
