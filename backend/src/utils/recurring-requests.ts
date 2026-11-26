import { Prisma, RequestSource, Urgency } from "@prisma/client";
import type { PrismaClient } from "@prisma/client";
import {
  moveToPreviousBusinessDay,
  nextRecurringDate,
} from "./business-days.js";

const generationHorizonYears = 1;

export function createRecurringRequestGenerator(prisma: PrismaClient) {
  let running = false;

  /** Creates planned request instances for the next calendar year from active recurring schedules. */
  async function generateRecurringOccurrence(
    schedule: Prisma.RecurringRequestScheduleGetPayload<Prisma.RecurringRequestScheduleDefaultArgs>,
    nextScheduledAt: Date,
  ) {
    return prisma.$transaction(async (transaction) => {
      const request = await transaction.request.create({
        data: {
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
          templateData: schedule.templateData as
            Prisma.InputJsonValue | undefined,
          componentsData: schedule.componentsData as
            Prisma.InputJsonValue | undefined,
          recurrenceScheduleId: schedule.id,
        },
      });
      await transaction.requestDepartmentHistory.create({
        data: {
          requestId: request.id,
          toDepartmentId: schedule.departmentId,
          transferredByUserId: schedule.createdById,
        },
      });
      await transaction.requestActivity.create({
        data: {
          requestId: request.id,
          authorUserId: schedule.createdById,
          kind: "RECURRING_CREATED",
          message: "Создана автоматически по повторяющемуся расписанию",
        },
      });
      if (schedule.assigneeUserId)
        await transaction.requestAssignee.create({
          data: {
            requestId: request.id,
            userId: schedule.assigneeUserId,
            assignedByUserId: schedule.createdById,
          },
        });
      const following = nextRecurringDate(
        nextScheduledAt,
        schedule.intervalDays,
      );
      await transaction.recurringRequestSchedule.update({
        where: { id: schedule.id },
        data: { nextScheduledAt: following },
      });
      return following;
    });
  }

  async function generateScheduleThroughHorizon(
    schedule: Prisma.RecurringRequestScheduleGetPayload<Prisma.RecurringRequestScheduleDefaultArgs>,
    horizon: Date,
  ) {
    let nextScheduledAt = schedule.nextScheduledAt;
    let generated = 0;
    while (nextScheduledAt <= horizon && generated < 100) {
      nextScheduledAt = await generateRecurringOccurrence(
        schedule,
        nextScheduledAt,
      );
      generated += 1;
    }
  }

  async function generateRecurringRequests() {
    if (running) return;
    running = true;
    try {
      const horizon = new Date();
      horizon.setFullYear(horizon.getFullYear() + generationHorizonYears);
      const schedules = await prisma.recurringRequestSchedule.findMany({
        where: { isActive: true, nextScheduledAt: { lte: horizon } },
        orderBy: { nextScheduledAt: "asc" },
      });
      for (const schedule of schedules)
        await generateScheduleThroughHorizon(schedule, horizon);
    } catch (error) {
      console.error("Unable to generate recurring requests:", error);
    } finally {
      running = false;
    }
  }

  return { generateRecurringRequests };
}
