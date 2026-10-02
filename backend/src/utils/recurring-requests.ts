import { Prisma, RequestSource, Urgency } from '@prisma/client'
import { prisma } from '../db.js'
import { moveToPreviousBusinessDay, nextRecurringDate } from './business-days.js'

const generationHorizonDays = 21
let running = false

/** Creates planned request instances for the next three weeks from active recurring schedules. */
export async function generateRecurringRequests() {
  if (running) return
  running = true
  try {
    const horizon = new Date()
    horizon.setDate(horizon.getDate() + generationHorizonDays)
    const schedules = await prisma.recurringRequestSchedule.findMany({
      where: { isActive: true, nextScheduledAt: { lte: horizon } },
      orderBy: { nextScheduledAt: 'asc' },
    })
    for (const schedule of schedules) {
      let nextScheduledAt = schedule.nextScheduledAt
      let generated = 0
      while (nextScheduledAt <= horizon && generated < 100) {
        await prisma.$transaction(async transaction => {
          const request = await transaction.request.create({ data: {
            storeId: schedule.storeId,
            organizationId: schedule.organizationId,
            createdByUserId: schedule.createdByUserId,
            typeId: schedule.typeId,
            departmentId: schedule.departmentId,
            urgency: Urgency.SCHEDULED,
            priority: schedule.priority,
            source: RequestSource.WEB,
            scheduledAt: moveToPreviousBusinessDay(nextScheduledAt),
            description: schedule.description,
            templateData: schedule.templateData as Prisma.InputJsonValue | undefined,
            componentsData: schedule.componentsData as Prisma.InputJsonValue | undefined,
            recurrenceScheduleId: schedule.id,
          } })
          await transaction.requestDepartmentHistory.create({ data: { requestId: request.id, toDepartmentId: schedule.departmentId, transferredByUserId: schedule.createdById } })
          await transaction.requestActivity.create({ data: { requestId: request.id, authorUserId: schedule.createdById, kind: 'RECURRING_CREATED', message: 'Создана автоматически по повторяющемуся расписанию' } })
          if (schedule.assigneeUserId) await transaction.requestAssignee.create({ data: { requestId: request.id, userId: schedule.assigneeUserId, assignedByUserId: schedule.createdById } })
          const following = nextRecurringDate(nextScheduledAt, schedule.intervalDays)
          await transaction.recurringRequestSchedule.update({ where: { id: schedule.id }, data: { nextScheduledAt: following } })
          nextScheduledAt = following
        })
        generated += 1
      }
    }
  } catch (error) {
    console.error('Unable to generate recurring requests:', error)
  } finally {
    running = false
  }
}
