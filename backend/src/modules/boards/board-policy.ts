import { BoardType, Role } from '@prisma/client'

export function canAccessBoard(input: { type: BoardType; ownerId: number; userId: number; hasExplicitAccess: boolean }) {
  return input.type === BoardType.PERSONAL ? input.ownerId === input.userId : input.ownerId === input.userId || input.hasExplicitAccess
}

export function canCreateTeamBoard(role: Role) {
  return role === Role.DIRECTOR || role === Role.DEPARTMENT_HEAD
}

export function versionMatches(current: number, known: number) {
  return current === known
}

export function moveItem<T extends { id: number }>(items: T[], itemId: number, targetIndex: number) {
  const item = items.find(value => value.id === itemId)
  if (!item) return [...items]
  const ordered = items.filter(value => value.id !== itemId)
  ordered.splice(Math.max(0, Math.min(targetIndex, ordered.length)), 0, item)
  return ordered
}
