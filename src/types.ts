export type Role = 'CLIENT' | 'DIRECTOR' | 'DEPARTMENT_HEAD' | 'MASTER'
export type UserStatus = 'PENDING' | 'ACTIVE' | 'REJECTED' | 'BLOCKED'
export type StoreStatus = 'PENDING' | 'ACTIVE' | 'REJECTED'
export type RequestStatus = 'NEW' | 'ACCEPTED' | 'IN_PROGRESS' | 'DONE' | 'CANCELLED'
export type Urgency = 'URGENT' | 'SCHEDULED'
export type OrganizationStatus = 'PENDING' | 'ACTIVE' | 'REJECTED'
export type OrganizationType = 'IP' | 'OOO' | 'OTHER'
export type Priority = 'LOW' | 'NORMAL' | 'HIGH' | 'CRITICAL'
export type PermissionKey = 'VIEW_ALL_REQUESTS' | 'MANAGE_REQUESTS' | 'CANCEL_REQUESTS' | 'TRANSFER_REQUESTS' | 'SET_PRIORITY' | 'ASSIGN_MASTERS' | 'MANAGE_CLIENTS' | 'MANAGE_ORGANIZATIONS' | 'MANAGE_STORES' | 'VIEW_STORE_SECRETS' | 'VIEW_TELEGRAM' | 'SEND_TELEGRAM' | 'MANAGE_TEMPLATES' | 'VIEW_REPORTS' | 'MANAGE_STAFF'

export interface Department { id: number; name: string; slug: string; isActive: boolean }

export interface User {
  id: number
  ipName: string
  email: string
  phone: string
  role: Role
  status: UserStatus
  rejectionReason?: string | null
  createdAt: string
  permissionOverrides?: Array<{ permission: PermissionKey; enabled: boolean }>
  departmentMemberships?: Array<{ departmentId: number; membershipRole: 'HEAD' | 'MASTER'; department: Department }>
  organizations?: Array<{ organization: Organization }>
  stores?: Store[]
  _count?: { createdRequests: number }
}

export interface Store {
  id: number
  userId?: number | null
  organizationId: number
  name: string
  address: string
  phone?: string | null
  status: StoreStatus
  rejectionReason?: string | null
  user?: Pick<User, 'id' | 'ipName' | 'phone' | 'status'>
  organization?: Organization
  access?: Pick<StoreAccess, 'anydeskId' | 'ofdUrl' | 'ofdLogin' | 'nalogUrl' | 'nalogLogin' | 'updatedAt'> | null
  _count?: { requests: number }
}

export interface Organization {
  id: number
  type: OrganizationType
  legalName: string
  shortName?: string | null
  inn?: string | null
  kpp?: string | null
  ogrn?: string | null
  legalAddress?: string | null
  contactName?: string | null
  phone?: string | null
  email?: string | null
  status: OrganizationStatus
  rejectionReason?: string | null
  members?: Array<{ user: Pick<User, 'id' | 'ipName' | 'email' | 'phone' | 'status'>; isPrimary: boolean }>
  stores?: Store[]
  _count?: { requests: number }
}

export interface StoreAccess {
  id?: number
  storeId?: number
  anydeskId?: string | null
  anydeskPassword?: string | null
  ofdUrl?: string | null
  ofdLogin?: string | null
  ofdPassword?: string | null
  nalogUrl?: string | null
  nalogLogin?: string | null
  nalogPassword?: string | null
  updatedAt?: string
}

export interface RequestType {
  id: number
  name: string
  description?: string | null
  color?: string | null
  isActive: boolean
  departmentId: number
  department: Department
  requiresOrganization: boolean
  requiresStore: boolean
  availableOnWeb: boolean
  availableOnTelegram: boolean
  defaultPriority: Priority
  templateFields?: TemplateField[] | null
}

export interface TemplateField { key: string; label: string; type: 'TEXT' | 'TEXTAREA' | 'NUMBER' | 'DATE' | 'SELECT' | 'CHECKBOX' | 'FILE'; required: boolean; options?: string[] }

export interface ServiceRequest {
  id: number
  storeId?: number | null
  organizationId?: number | null
  createdByUserId?: number | null
  typeId: number
  departmentId: number
  urgency: Urgency
  priority: Priority
  source: 'WEB' | 'TELEGRAM_ACCOUNT' | 'TELEGRAM_BOT'
  scheduledAt?: string | null
  description: string
  templateData?: Record<string, unknown> | null
  status: RequestStatus
  adminComment?: string | null
  createdAt: string
  updatedAt: string
  closedAt?: string | null
  store?: Store | null
  organization?: Organization | null
  type: RequestType
  department: Department
  createdBy?: Pick<User, 'id' | 'ipName' | 'phone' | 'email'> | null
  assignees: Array<{ user: Pick<User, 'id' | 'ipName' | 'email' | 'phone' | 'role'>; assignedAt: string }>
  comments: Array<{ id: number; body: string; visibility: 'INTERNAL' | 'CLIENT'; createdAt: string; author: Pick<User, 'id' | 'ipName' | 'role'> }>
  activities: Array<{ id: number; kind: string; message: string; createdAt: string; author?: Pick<User, 'id' | 'ipName' | 'role'> | null }>
  departmentHistory: Array<{ id: number; createdAt: string; fromDepartment?: Department | null; toDepartment: Department; transferredBy: Pick<User, 'id' | 'ipName'> }>
}

export interface StaffMember extends User { departmentMemberships: Array<{ departmentId: number; membershipRole: 'HEAD' | 'MASTER'; department: Department }>; permissionOverrides: Array<{ permission: PermissionKey; enabled: boolean }>; linkedTelegramChats?: Array<{ id: number; title: string; username?: string | null }> }
export interface TelegramIntegration { id: number; kind: 'USER_ACCOUNT' | 'BOT'; status: 'DISABLED' | 'NEEDS_CONFIGURATION' | 'CONNECTING' | 'ACTIVE' | 'ERROR'; displayName?: string | null; lastError?: string | null }
export interface TelegramChat { id: number; title: string; username?: string | null; unreadCount: number; lastMessageAt?: string | null; integration: TelegramIntegration; organization?: Organization | null; store?: Store | null; linkedUser?: Pick<User, 'id' | 'ipName' | 'email'> | null; messages: Array<{ body?: string | null; sentAt: string }> }

export interface Stats {
  total: number
  urgent: number
  activeClients: number
  byStatus: Array<{ status: RequestStatus; _count: { _all: number } }>
  byType: Array<{ typeId: number; _count: { _all: number }; type?: Pick<RequestType, 'id' | 'name' | 'color'> }>
}
