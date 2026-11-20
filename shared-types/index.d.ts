export type RoleDTO = "CLIENT" | "DIRECTOR" | "DEPARTMENT_HEAD" | "MASTER";
export type UserStatusDTO = "PENDING" | "ACTIVE" | "REJECTED" | "BLOCKED";
export type StoreStatusDTO = "PENDING" | "ACTIVE" | "REJECTED";

export interface UserSummaryDTO {
  id: number;
  ipName: string;
  email: string;
  phone: string;
  role: RoleDTO;
  status: UserStatusDTO;
}

export interface BoardAccessUserDTO extends Pick<
  UserSummaryDTO,
  "id" | "ipName" | "email" | "role"
> {
  hasAccess: boolean;
  isOwner: boolean;
}

export interface RequestAssigneeDTO extends Pick<
  UserSummaryDTO,
  "id" | "ipName" | "email" | "role"
> {
  departmentMemberships: Array<{
    departmentId: number;
    membershipRole: "HEAD" | "MASTER";
    department: { id: number; name: string; slug: string; isActive: boolean };
  }>;
}

export interface OrganizationContactDTO {
  id: number;
  fullName: string;
  phone: string | null;
  note: string | null;
}

export interface OrganizationMemberDTO {
  user: Pick<UserSummaryDTO, "id" | "ipName" | "email" | "phone" | "status">;
  isPrimary: boolean;
}

export interface StoreSummaryDTO {
  id: number;
  organizationId: number;
  name: string;
  address: string;
  phone: string | null;
  status: StoreStatusDTO;
  user: Pick<UserSummaryDTO, "id" | "ipName" | "phone" | "status">;
  access: {
    anydeskId: string | null;
    ofdUrl: string | null;
    ofdLogin: string | null;
    nalogUrl: string | null;
    nalogLogin: string | null;
    updatedAt: Date | string;
  } | null;
  _count: { requests: number };
}

export interface ClientSummaryDTO extends UserSummaryDTO {
  rejectionReason: string | null;
  createdAt: Date | string;
  stores: Array<{
    id: number;
    organizationId: number;
    name: string;
    address: string;
    phone: string | null;
    status: StoreStatusDTO;
  }>;
  _count: { createdRequests: number };
}
