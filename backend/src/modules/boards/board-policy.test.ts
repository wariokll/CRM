import { BoardType, Role } from '@prisma/client'
import { describe, expect, it } from 'vitest'
import { canAccessBoard, canCreateTeamBoard, moveItem, versionMatches } from './board-policy.js'

describe('board access policy', () => {
  it('keeps personal boards private even from a director', () => {
    expect(canAccessBoard({ type: BoardType.PERSONAL, ownerId: 1, userId: 2, hasExplicitAccess: true })).toBe(false)
  })

  it('allows only the team board owner or an explicitly granted employee', () => {
    expect(canAccessBoard({ type: BoardType.TEAM, ownerId: 1, userId: 2, hasExplicitAccess: false })).toBe(false)
    expect(canAccessBoard({ type: BoardType.TEAM, ownerId: 1, userId: 2, hasExplicitAccess: true })).toBe(true)
    expect(canAccessBoard({ type: BoardType.TEAM, ownerId: 1, userId: 1, hasExplicitAccess: false })).toBe(true)
  })

  it('allows team board creation only for department heads and directors', () => {
    expect(canCreateTeamBoard(Role.DIRECTOR)).toBe(true)
    expect(canCreateTeamBoard(Role.DEPARTMENT_HEAD)).toBe(true)
    expect(canCreateTeamBoard(Role.MASTER)).toBe(false)
    expect(canCreateTeamBoard(Role.CLIENT)).toBe(false)
  })
})

describe('board concurrency and ordering', () => {
  it('detects a stale version', () => {
    expect(versionMatches(4, 4)).toBe(true)
    expect(versionMatches(5, 4)).toBe(false)
  })

  it('moves an item and preserves every other item order', () => {
    expect(moveItem([{ id: 1 }, { id: 2 }, { id: 3 }], 1, 2).map(item => item.id)).toEqual([2, 3, 1])
    expect(moveItem([{ id: 1 }, { id: 2 }, { id: 3 }], 3, 0).map(item => item.id)).toEqual([3, 1, 2])
  })
})
