import { PermissionKey, Role, type Prisma } from '@prisma/client'
import { hasPermission, type UserAccess } from '../../utils/permissions.js'

/** Central access rules for request lists, details and reports. */
export function requestVisibilityWhere(access: UserAccess): Prisma.RequestWhereInput {
  if (access.role === Role.CLIENT) return { OR: [{ createdByUserId: access.userId }, { organization: { members: { some: { userId: access.userId } } } }] }
  if (access.role === Role.DIRECTOR || hasPermission(access, PermissionKey.VIEW_ALL_REQUESTS)) return {}
  if (access.role === Role.DEPARTMENT_HEAD) return { OR: [{ departmentId: { in: access.departmentIds } }, { departmentHistory: { some: { OR: [{ fromDepartmentId: { in: access.departmentIds } }, { toDepartmentId: { in: access.departmentIds } }] } } }] }
  return { departmentId: { in: access.departmentIds } }
}

export function canManageRequest(access: UserAccess, departmentId: number) {
  return access.role === Role.DIRECTOR || (access.role === Role.DEPARTMENT_HEAD && access.headedDepartmentIds.includes(departmentId))
}
