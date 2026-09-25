import { RequestStatus } from '@prisma/client'
import { describe, expect, it } from 'vitest'
import { canChangeRequestStatus } from './request-status.js'

describe('request status lifecycle', () => {
  it('allows the normal lifecycle', () => {
    expect(canChangeRequestStatus(RequestStatus.NEW, RequestStatus.ACCEPTED)).toBe(true)
    expect(canChangeRequestStatus(RequestStatus.ACCEPTED, RequestStatus.IN_PROGRESS)).toBe(true)
    expect(canChangeRequestStatus(RequestStatus.IN_PROGRESS, RequestStatus.DONE)).toBe(true)
  })

  it('allows cancellation only before a terminal state', () => {
    expect(canChangeRequestStatus(RequestStatus.NEW, RequestStatus.CANCELLED)).toBe(true)
    expect(canChangeRequestStatus(RequestStatus.ACCEPTED, RequestStatus.CANCELLED)).toBe(true)
    expect(canChangeRequestStatus(RequestStatus.IN_PROGRESS, RequestStatus.CANCELLED)).toBe(true)
    expect(canChangeRequestStatus(RequestStatus.DONE, RequestStatus.CANCELLED)).toBe(false)
  })

  it('rejects backward transitions', () => {
    expect(canChangeRequestStatus(RequestStatus.IN_PROGRESS, RequestStatus.ACCEPTED)).toBe(false)
    expect(canChangeRequestStatus(RequestStatus.DONE, RequestStatus.NEW)).toBe(false)
  })
})
