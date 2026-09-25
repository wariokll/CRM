export type Role = 'CLIENT' | 'ADMIN'
export type UserStatus = 'PENDING' | 'ACTIVE' | 'REJECTED' | 'BLOCKED'
export type StoreStatus = 'PENDING' | 'ACTIVE' | 'REJECTED'
export type RequestStatus = 'NEW' | 'ACCEPTED' | 'IN_PROGRESS' | 'DONE' | 'CANCELLED'
export type Urgency = 'URGENT' | 'SCHEDULED'

export interface User {
  id: number
  ipName: string
  email: string
  phone: string
  role: Role
  status: UserStatus
  rejectionReason?: string | null
  createdAt: string
  stores?: Store[]
  _count?: { createdRequests: number }
}

export interface Store {
  id: number
  userId: number
  name: string
  address: string
  phone?: string | null
  status: StoreStatus
  rejectionReason?: string | null
  user?: Pick<User, 'id' | 'ipName' | 'phone' | 'status'>
  access?: Pick<StoreAccess, 'anydeskId' | 'ofdUrl' | 'ofdLogin' | 'nalogUrl' | 'nalogLogin' | 'updatedAt'> | null
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
}

export interface ServiceRequest {
  id: number
  storeId: number
  createdByUserId: number
  typeId: number
  urgency: Urgency
  scheduledAt?: string | null
  description: string
  status: RequestStatus
  adminComment?: string | null
  assignedAdminId?: number | null
  createdAt: string
  updatedAt: string
  closedAt?: string | null
  store: Store & { user: Pick<User, 'id' | 'ipName' | 'phone'> }
  type: RequestType
  createdBy: Pick<User, 'id' | 'ipName' | 'phone'>
}

export interface Stats {
  total: number
  urgent: number
  activeClients: number
  byStatus: Array<{ status: RequestStatus; _count: { _all: number } }>
  byType: Array<{ typeId: number; _count: { _all: number }; type?: Pick<RequestType, 'id' | 'name' | 'color'> }>
}
