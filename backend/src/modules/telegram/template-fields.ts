export type TelegramTemplateField = { key: string; label: string; type: 'TEXT' | 'TEXTAREA' | 'NUMBER' | 'DATE' | 'SELECT' | 'CHECKBOX' | 'FILE'; required?: boolean; options?: string[] }

export function templateFields(value: unknown): TelegramTemplateField[] {
  if (!Array.isArray(value)) return []
  return value.filter((field): field is TelegramTemplateField => Boolean(field && typeof field === 'object' && typeof (field as TelegramTemplateField).key === 'string' && typeof (field as TelegramTemplateField).label === 'string'))
}

export function fieldPrompt(field: TelegramTemplateField) {
  const required = field.required ? 'обязательно' : 'можно отправить «-», чтобы пропустить'
  if (field.type === 'SELECT' && field.options?.length) return `${field.label} (${required}):\n${field.options.map((option, index) => `${index + 1}. ${option}`).join('\n')}\nОтправьте номер или значение.`
  if (field.type === 'CHECKBOX') return `${field.label}: ответьте «да» или «нет»${field.required ? ' (обязательно)' : ''}.`
  if (field.type === 'DATE') return `${field.label} (${required}): укажите дату в формате ДД.ММ.ГГГГ.`
  if (field.type === 'NUMBER') return `${field.label} (${required}): укажите число.`
  if (field.type === 'FILE') return `${field.label} (${required}): отправьте ссылку на файл или его описание одним сообщением.`
  return `${field.label} (${required}):`
}

export function parseFieldValue(field: TelegramTemplateField, input: string): { ok: true; value?: unknown } | { ok: false; message: string } {
  if (!input || input === '-') return field.required ? { ok: false, message: `Поле «${field.label}» обязательно. ${fieldPrompt(field)}` } : { ok: true }
  if (field.type === 'NUMBER' && !Number.isFinite(Number(input.replace(',', '.')))) return { ok: false, message: `Для поля «${field.label}» укажите число.` }
  if (field.type === 'CHECKBOX') { if (['да', 'yes', '1', '+'].includes(input.toLowerCase())) return { ok: true, value: true }; if (['нет', 'no', '0', '-'].includes(input.toLowerCase())) return { ok: true, value: false }; return { ok: false, message: `Для поля «${field.label}» ответьте «да» или «нет».` } }
  if (field.type === 'SELECT' && field.options?.length) { const option = field.options[Number(input) - 1] ?? field.options.find(option => option.toLowerCase() === input.toLowerCase()); return option ? { ok: true, value: option } : { ok: false, message: `Выберите один из предложенных вариантов для поля «${field.label}».` } }
  return { ok: true, value: field.type === 'NUMBER' ? Number(input.replace(',', '.')) : input }
}
