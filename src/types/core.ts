import type {
  OrganizationContactDTO,
  OrganizationMemberDTO,
  RoleDTO,
  UserStatusDTO,
} from "@crm/shared-types";

export type Role = RoleDTO;
export type UserStatus = UserStatusDTO;
export type StoreStatus = "PENDING" | "ACTIVE" | "REJECTED";
export type RequestStatus =
  "NEW" | "ACCEPTED" | "IN_PROGRESS" | "DONE" | "CANCELLED";
export type Urgency = "URGENT" | "SCHEDULED";
export type OrganizationStatus = "PENDING" | "ACTIVE" | "REJECTED";
export type OrganizationType = "IP" | "OOO" | "OTHER";
export type Priority = "LOW" | "NORMAL" | "HIGH" | "CRITICAL";
export type PermissionKey =
  | "VIEW_ALL_REQUESTS"
  | "MANAGE_REQUESTS"
  | "CANCEL_REQUESTS"
  | "TRANSFER_REQUESTS"
  | "SET_PRIORITY"
  | "ASSIGN_MASTERS"
  | "MANAGE_CLIENTS"
  | "MANAGE_ORGANIZATIONS"
  | "MANAGE_STORES"
  | "VIEW_STORE_SECRETS"
  | "VIEW_TELEGRAM"
  | "SEND_TELEGRAM"
  | "MANAGE_TEMPLATES"
  | "VIEW_REPORTS"
  | "MANAGE_STAFF"
  | "MANAGE_KNOWLEDGE"
  | "DELETE_ORGANIZATIONS"
  | "DELETE_STORES"
  | "DELETE_REQUESTS";

export interface Department {
  id: number;
  name: string;
  slug: string;
  isActive: boolean;
}

export interface User {
  id: number;
  ipName: string;
  email: string;
  phone: string;
  role: Role;
  status: UserStatus;
  rejectionReason?: string | null;
  createdAt: string;
  permissionOverrides?: Array<{ permission: PermissionKey; enabled: boolean }>;
  departmentMemberships?: Array<{
    departmentId: number;
    membershipRole: "HEAD" | "MASTER";
    department: Department;
  }>;
  organizations?: Array<{ organization: Organization }>;
  stores?: Store[];
  _count?: { createdRequests: number };
}

export interface Store {
  id: number;
  userId?: number | null;
  organizationId: number;
  name: string;
  address: string;
  phone?: string | null;
  status: StoreStatus;
  rejectionReason?: string | null;
  user?: Pick<User, "id" | "ipName" | "phone" | "status">;
  organization?: Organization;
  access?: Pick<
    StoreAccess,
    | "anydeskId"
    | "ofdUrl"
    | "ofdLogin"
    | "nalogUrl"
    | "nalogLogin"
    | "updatedAt"
  > | null;
  _count?: { requests: number };
}

export interface Organization {
  id: number;
  type: OrganizationType;
  legalName: string;
  shortName?: string | null;
  inn?: string | null;
  kpp?: string | null;
  ogrn?: string | null;
  legalAddress?: string | null;
  contactName?: string | null;
  phone?: string | null;
  email?: string | null;
  contacts?: OrganizationContactDTO[];
  status: OrganizationStatus;
  rejectionReason?: string | null;
  members?: OrganizationMemberDTO[];
  stores?: Store[];
  _count?: { requests: number };
}

export interface StoreAccess {
  id?: number;
  storeId?: number;
  anydeskId?: string | null;
  anydeskPassword?: string | null;
  ofdUrl?: string | null;
  ofdLogin?: string | null;
  ofdPassword?: string | null;
  nalogUrl?: string | null;
  nalogLogin?: string | null;
  nalogPassword?: string | null;
  updatedAt?: string;
}

export interface RequestType {
  id: number;
  name: string;
  description?: string | null;
  color?: string | null;
  isActive: boolean;
  departmentId: number;
  department: Department;
  requiresOrganization: boolean;
  requiresStore: boolean;
  availableOnWeb: boolean;
  availableOnTelegram: boolean;
  requiresComponents: boolean;
  defaultPriority: Priority;
  templateFields?: TemplateField[] | null;
  componentRequirements: Array<{
    componentId: number;
    quantity: number;
    component: Component;
  }>;
}

export interface TemplateField {
  key: string;
  label: string;
  type:
    "TEXT" | "TEXTAREA" | "NUMBER" | "DATE" | "SELECT" | "CHECKBOX" | "FILE";
  required: boolean;
  options?: string[];
}
export interface Component {
  id: number;
  name: string;
  isActive: boolean;
}

export interface ServiceRequest {
  id: number;
  storeId?: number | null;
  organizationId?: number | null;
  createdByUserId?: number | null;
  typeId: number;
  departmentId: number;
  urgency: Urgency;
  priority: Priority;
  source: "WEB" | "TELEGRAM_ACCOUNT" | "TELEGRAM_BOT";
  scheduledAt?: string | null;
  description: string;
  templateData?: Record<string, unknown> | null;
  componentsData?: Array<{
    componentId: number;
    name: string;
    quantity: number;
  }> | null;
  status: RequestStatus;
  adminComment?: string | null;
  recurrenceSchedule?: {
    id: number;
    intervalDays: number;
    nextScheduledAt: string;
    isActive: boolean;
  } | null;
  createdAt: string;
  updatedAt: string;
  closedAt?: string | null;
  store?: Store | null;
  organization?: Organization | null;
  type: RequestType;
  department: Department;
  createdBy?: Pick<User, "id" | "ipName" | "phone" | "email"> | null;
  assignees: Array<{
    user: Pick<User, "id" | "ipName" | "email" | "phone" | "role">;
    assignedAt: string;
  }>;
  comments: Array<{
    id: number;
    body: string;
    visibility: "INTERNAL" | "CLIENT";
    createdAt: string;
    author: Pick<User, "id" | "ipName" | "role">;
  }>;
  activities: Array<{
    id: number;
    kind: string;
    message: string;
    createdAt: string;
    author?: Pick<User, "id" | "ipName" | "role"> | null;
  }>;
  departmentHistory: Array<{
    id: number;
    createdAt: string;
    fromDepartment?: Department | null;
    toDepartment: Department;
    transferredBy: Pick<User, "id" | "ipName">;
  }>;
}

export interface StaffMember extends User {
  departmentMemberships: Array<{
    departmentId: number;
    membershipRole: "HEAD" | "MASTER";
    department: Department;
  }>;
  permissionOverrides: Array<{ permission: PermissionKey; enabled: boolean }>;
  linkedTelegramChats?: Array<{
    id: number;
    title: string;
    username?: string | null;
  }>;
}
