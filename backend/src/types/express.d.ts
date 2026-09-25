import type { Role } from '@prisma/client'

declare global {
  namespace Express {
    interface Request { auth?: { userId: number; role: Role } }
  }
}

export {}
