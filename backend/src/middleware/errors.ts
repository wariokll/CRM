import type { ErrorRequestHandler } from 'express'
import { ZodError } from 'zod'

const fieldNames: Record<string, string> = {
  status: 'Статус', priority: 'Приоритет', departmentId: 'Отдел', assigneeIds: 'Исполнители', adminComment: 'Комментарий',
  storeId: 'Торговая точка', organizationId: 'Организация', typeId: 'Шаблон заявки', urgency: 'Срочность', scheduledAt: 'Дата работ', description: 'Описание', templateData: 'Дополнительные поля',
  name: 'Название', slug: 'Код отдела', email: 'Email', phone: 'Телефон', password: 'Пароль', ipName: 'Название организации',
  legalName: 'Полное название', shortName: 'Сокращённое название', inn: 'ИНН', kpp: 'КПП', ogrn: 'ОГРН / ОГРНИП', legalAddress: 'Юридический адрес', contactName: 'Контактное лицо',
  departmentIds: 'Отделы', permissions: 'Разрешения', body: 'Текст сообщения', visibility: 'Видимость комментария',
}

function formatIssue(issue: ZodError['issues'][number]) {
  const path = issue.path.join('.') || 'Данные'
  const field = fieldNames[String(issue.path[0] ?? '')] ?? path
  if (issue.code === 'too_small') return `${field}: заполните поле (минимум ${issue.minimum} ${issue.type === 'string' ? 'симв.' : 'знач.'})`
  if (issue.code === 'too_big') return `${field}: значение слишком длинное (максимум ${issue.maximum})`
  if (issue.code === 'invalid_string' && issue.validation === 'email') return `${field}: укажите корректный email`
  if (issue.code === 'invalid_type' && issue.received === 'undefined') return `${field}: поле обязательно`
  if (issue.code === 'invalid_type') return `${field}: указан неверный формат значения`
  if (issue.code === 'invalid_enum_value') return `${field}: выберите допустимое значение`
  if (issue.code === 'invalid_string') return `${field}: значение имеет неверный формат`
  return `${field}: ${issue.message}`
}

export const errorHandler: ErrorRequestHandler = (error, _req, res, _next) => {
  if (error instanceof ZodError) {
    const issues = error.issues.map(formatIssue)
    return res.status(400).json({ message: issues.length === 1 ? issues[0] : `Исправьте поля: ${issues.join('; ')}`, issues })
  }
  if ((error as { code?: string }).code === 'P2002') return res.status(409).json({ message: 'Запись с такими данными уже существует' })
  if ((error as { code?: string }).code === 'P2025') return res.status(404).json({ message: 'Запись не найдена' })
  console.error(error)
  return res.status(500).json({ message: 'Внутренняя ошибка сервера' })
}
