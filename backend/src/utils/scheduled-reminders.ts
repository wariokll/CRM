import { RequestStatus, Urgency } from '@prisma/client'
import { prisma } from '../db.js'
import { notifyRequestAssignees, notifyRequestClient } from './telegram-notifications.js'

const slots = [
  { kind: 'DAY_BEFORE', label: 'Завтра', minutes: 24 * 60 },
  { kind: 'TWO_HOURS', label: 'Через 2 часа', minutes: 2 * 60 },
] as const

let running = false

function dateText(value: Date) {
  return new Intl.DateTimeFormat('ru-RU', { dateStyle: 'medium', timeStyle: 'short' }).format(value)
}

/** Sends each planned-request reminder only once to linked clients and assigned staff. */
export async function sendScheduledRequestReminders() {
  if (running) return
  running = true
  try {
    const now = Date.now()
    for (const slot of slots) {
      const target = now + slot.minutes * 60_000
      const windowStart = new Date(target - 15 * 60_000)
      const windowEnd = new Date(target + 15 * 60_000)
      const requests = await prisma.request.findMany({
        where: { urgency: Urgency.SCHEDULED, status: { notIn: [RequestStatus.DONE, RequestStatus.CANCELLED] }, scheduledAt: { gte: windowStart, lte: windowEnd } },
        include: { type: true, store: true, organization: true },
      })
      for (const request of requests) {
        if (!request.scheduledAt) continue
        const place = request.store?.name ?? request.organization?.legalName
        const clientText = `${slot.label}: запланирована заявка «${request.type.name}» на ${dateText(request.scheduledAt)}${place ? ` (${place})` : ''}.`
        const staffText = `${slot.label}: у вас запланирована заявка «${request.type.name}» на ${dateText(request.scheduledAt)}${place ? ` (${place})` : ''}.`
        const [clientReminder, staffReminder] = await Promise.all([
          prisma.requestReminder.findUnique({ where: { requestId_kind_audience: { requestId: request.id, kind: slot.kind, audience: 'CLIENT' } } }),
          prisma.requestReminder.findUnique({ where: { requestId_kind_audience: { requestId: request.id, kind: slot.kind, audience: 'STAFF' } } }),
        ])
        if (!clientReminder && await notifyRequestClient(request.id, clientText)) await prisma.requestReminder.create({ data: { requestId: request.id, kind: slot.kind, audience: 'CLIENT' } })
        if (!staffReminder && await notifyRequestAssignees(request.id, staffText)) await prisma.requestReminder.create({ data: { requestId: request.id, kind: slot.kind, audience: 'STAFF' } })
      }
    }
  } catch (error) {
    console.error('Unable to process scheduled request reminders:', error)
  } finally {
    running = false
  }
}
