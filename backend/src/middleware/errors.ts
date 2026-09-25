import type { ErrorRequestHandler } from 'express'
import { ZodError } from 'zod'

export const errorHandler: ErrorRequestHandler = (error, _req, res, _next) => {
  if (error instanceof ZodError) return res.status(400).json({ message: 'Проверьте заполнение полей', issues: error.flatten() })
  if ((error as { code?: string }).code === 'P2002') return res.status(409).json({ message: 'Запись с такими данными уже существует' })
  if ((error as { code?: string }).code === 'P2025') return res.status(404).json({ message: 'Запись не найдена' })
  console.error(error)
  return res.status(500).json({ message: 'Внутренняя ошибка сервера' })
}
