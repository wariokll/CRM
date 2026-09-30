import { PermissionKey, Role, UserStatus } from '@prisma/client'
import type { NextFunction, Request, Response } from 'express'
import { prisma } from '../db.js'

const allPermissions = Object.values(PermissionKey)

const defaults: Record<Role, readonly PermissionKey[]> = {
  DIRECTOR: allPermissions,
  DEPARTMENT_HEAD: [
    PermissionKey.MANAGE_REQUESTS,
    PermissionKey.CANCEL_REQUESTS,
    PermissionKey.TRANSFER_REQUESTS,
    PermissionKey.SET_PRIORITY,
    PermissionKey.ASSIGN_MASTERS,
    PermissionKey.VIEW_STORE_SECRETS,
    PermissionKey.VIEW_TELEGRAM,
    PermissionKey.SEND_TELEGRAM,
    PermissionKey.MANAGE_TEMPLATES,
    PermissionKey.VIEW_REPORTS,
  ],
  MASTER: [
    PermissionKey.MANAGE_REQUESTS,
    PermissionKey.VIEW_STORE_SECRETS,
    PermissionKey.VIEW_TELEGRAM,
    PermissionKey.SEND_TELEGRAM,
  ],
  CLIENT: [],
}

export interface UserAccess {
  userId: number
  role: Role
  status: UserStatus
  permissions: Set<PermissionKey>
  departmentIds: number[]
  headedDepartmentIds: number[]
}

export async function getUserAccess(userId: number): Promise<UserAccess | null> {
  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: {
      id: true,
      role: true,
      status: true,
      permissionOverrides: true,
      departmentMemberships: { select: { departmentId: true, membershipRole: true } },
    },
  })
  if (!user) return null
  const permissions = new Set(defaults[user.role])
  for (const override of user.permissionOverrides) {
    if (override.enabled) permissions.add(override.permission)
    else permissions.delete(override.permission)
  }
  return {
    userId: user.id,
    role: user.role,
    status: user.status,
    permissions,
    departmentIds: user.departmentMemberships.map(item => item.departmentId),
    headedDepartmentIds: user.departmentMemberships.filter(item => item.membershipRole === 'HEAD').map(item => item.departmentId),
  }
}

export function hasPermission(access: UserAccess, permission: PermissionKey): boolean {
  return access.permissions.has(permission)
}

export function requirePermission(permission: PermissionKey) {
  return async (req: Request, res: Response, next: NextFunction) => {
    if (!req.auth) return res.status(401).json({ message: 'Требуется авторизация' })
    const access = await getUserAccess(req.auth.userId)
    if (!access || access.status !== UserStatus.ACTIVE || !hasPermission(access, permission)) return res.status(403).json({ message: 'Недостаточно прав' })
    req.access = access
    next()
  }
}
