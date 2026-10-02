import { RequestStatus, Role, Urgency, type Prisma } from '@prisma/client'
import { prisma } from '../../db.js'
import { type UserAccess } from '../../utils/permissions.js'
import { requestVisibilityWhere } from './request-policy.js'

export function parseReportPeriod(fromValue: unknown, toValue: unknown) {
  const from = typeof fromValue === 'string' ? new Date(fromValue) : new Date(new Date().getFullYear(), new Date().getMonth(), 1)
  const to = typeof toValue === 'string' ? new Date(toValue) : new Date()
  if (Number.isNaN(from.getTime()) || Number.isNaN(to.getTime()) || from > to) throw new Error('Некорректный период отчёта')
  to.setHours(23, 59, 59, 999)
  return { from, to }
}

export async function buildRequestReport(access: UserAccess, from: Date, to: Date) {
  const where: Prisma.RequestWhereInput = { AND: [requestVisibilityWhere(access), { createdAt: { gte: from, lte: to } }] }
  const [total, byStatus, byType, urgent, activeClients, reportRows] = await Promise.all([
    prisma.request.count({ where }), prisma.request.groupBy({ by: ['status'], where, _count: { _all: true } }), prisma.request.groupBy({ by: ['typeId'], where, _count: { _all: true } }), prisma.request.count({ where: { AND: [where, { urgency: Urgency.URGENT }] } }), prisma.user.count({ where: { role: Role.CLIENT, status: 'ACTIVE' } }),
    prisma.request.findMany({ where, select: { id: true, status: true, priority: true, createdAt: true, closedAt: true, scheduledAt: true, source: true, organization: { select: { id: true, legalName: true } }, store: { select: { id: true, name: true } }, department: { select: { id: true, name: true } }, assignees: { select: { user: { select: { id: true, ipName: true } } } } } }),
  ])
  const types = await prisma.requestType.findMany({ where: { id: { in: byType.map(item => item.typeId) } }, select: { id: true, name: true, color: true } })
  const aggregate = <T extends { id: number; name: string }>(items: Array<T | null | undefined>) => Object.values(items.filter(Boolean).reduce<Record<number, { id: number; name: string; count: number }>>((result, entry) => { const item = entry!; result[item.id] ??= { ...item, count: 0 }; result[item.id].count += 1; return result }, {})).sort((left, right) => right.count - left.count || left.name.localeCompare(right.name, 'ru'))
  const completed = reportRows.filter(row => row.status === RequestStatus.DONE)
  const terminal: RequestStatus[] = [RequestStatus.DONE, RequestStatus.CANCELLED]
  const sources = Object.entries(reportRows.reduce<Record<string, number>>((result, row) => { result[row.source] = (result[row.source] ?? 0) + 1; return result }, {})).map(([source, count]) => ({ source, count }))
  return { total, urgent, activeClients, completed: completed.length, overdue: reportRows.filter(row => row.scheduledAt && row.scheduledAt < new Date() && !terminal.includes(row.status)).length, averageResolutionHours: completed.length ? Math.round(completed.reduce((sum, row) => sum + ((row.closedAt?.getTime() ?? row.createdAt.getTime()) - row.createdAt.getTime()) / 3600000, 0) / completed.length * 10) / 10 : 0, byStatus, byType: byType.map(item => ({ ...item, type: types.find(type => type.id === item.typeId) })), clients: aggregate(reportRows.map(row => row.organization ? { id: row.organization.id, name: row.organization.legalName } : null)), stores: aggregate(reportRows.map(row => row.store ? { id: row.store.id, name: row.store.name } : null)), employees: aggregate(reportRows.flatMap(row => row.assignees.map(assignee => ({ id: assignee.user.id, name: assignee.user.ipName })))), departments: aggregate(reportRows.map(row => ({ id: row.department.id, name: row.department.name }))), sources, requests: reportRows.map(row => ({ id: row.id, status: row.status, priority: row.priority, createdAt: row.createdAt, closedAt: row.closedAt, scheduledAt: row.scheduledAt, source: row.source, organization: row.organization, store: row.store, department: row.department, assignees: row.assignees.map(item => item.user.ipName) })) }
}

type StoredComponent = { componentId?: unknown; name?: unknown; quantity?: unknown }

function storedComponents(value: unknown) {
  if (!Array.isArray(value)) return []
  return value.flatMap(item => {
    if (!item || typeof item !== 'object') return []
    const component = item as StoredComponent
    if (typeof component.componentId !== 'number' || typeof component.name !== 'string' || typeof component.quantity !== 'number' || component.quantity <= 0) return []
    return [{ componentId: component.componentId, name: component.name, quantity: component.quantity }]
  })
}

/** Aggregates the components required by active planned requests in the selected work period. */
export async function buildProcurementReport(access: UserAccess, from: Date, to: Date, componentId?: number) {
  const rows = await prisma.request.findMany({ where: {
    AND: [requestVisibilityWhere(access), { urgency: Urgency.SCHEDULED, scheduledAt: { gte: from, lte: to }, status: { notIn: [RequestStatus.DONE, RequestStatus.CANCELLED] } }],
  }, include: { organization: { select: { legalName: true } }, store: { select: { name: true } } }, orderBy: { scheduledAt: 'asc' } })
  const result = new Map<number, { componentId: number; name: string; quantity: number; requests: number; schedule: Array<{ requestId: number; scheduledAt: Date | null; organization: string | null; store: string | null; quantity: number }> }>()
  for (const row of rows) for (const component of storedComponents(row.componentsData).filter(item => !componentId || item.componentId === componentId)) {
    const item = result.get(component.componentId) ?? { componentId: component.componentId, name: component.name, quantity: 0, requests: 0, schedule: [] }
    item.quantity += component.quantity
    item.requests += 1
    item.schedule.push({ requestId: row.id, scheduledAt: row.scheduledAt, organization: row.organization?.legalName ?? null, store: row.store?.name ?? null, quantity: component.quantity })
    result.set(component.componentId, item)
  }
  return Array.from(result.values()).sort((left, right) => right.quantity - left.quantity || left.name.localeCompare(right.name, 'ru'))
}
