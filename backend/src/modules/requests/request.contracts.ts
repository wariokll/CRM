import { Priority, RequestSource, RequestStatus, Urgency } from '@prisma/client'
import { z } from 'zod'

export const createRequestSchema = z.object({
  storeId: z.number().int().positive().nullable().optional(),
  organizationId: z.number().int().positive().nullable().optional(),
  typeId: z.number().int().positive(),
  departmentId: z.number().int().positive().optional(),
  urgency: z.nativeEnum(Urgency),
  priority: z.nativeEnum(Priority).optional(),
  assigneeId: z.number().int().positive().optional(),
  recurrenceIntervalDays: z.number().int().min(1).max(3650).optional(),
  scheduledAt: z.coerce.date().optional(),
  description: z.string().min(5).max(5000),
  templateData: z.record(z.string(), z.unknown()).optional(),
  components: z.array(z.object({ componentId: z.number().int().positive(), quantity: z.number().int().min(1).max(100000) })).max(50).optional(),
  source: z.nativeEnum(RequestSource).optional(),
})

export const updateRequestSchema = z.object({
  status: z.nativeEnum(RequestStatus).optional(),
  priority: z.nativeEnum(Priority).optional(),
  departmentId: z.number().int().positive().optional(),
  assigneeIds: z.array(z.number().int().positive()).optional(),
  adminComment: z.string().max(5000).nullable().optional(),
})

export function validateRequiredTemplateFields(fields: unknown, data: Record<string, unknown>) {
  if (!Array.isArray(fields)) return
  for (const raw of fields) {
    if (!raw || typeof raw !== 'object') continue
    const field = raw as { key?: string; label?: string; required?: boolean }
    if (field.required && field.key && (data[field.key] === undefined || data[field.key] === null || data[field.key] === '')) throw new Error(`Заполните поле «${field.label ?? field.key}»`)
  }
}
