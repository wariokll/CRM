import bcrypt from 'bcrypt'
import { PrismaClient, Role, UserStatus } from '@prisma/client'

const prisma = new PrismaClient()

async function main() {
  const password = process.env.ADMIN_PASSWORD
  if (!password || password === 'change-this-before-first-seed') throw new Error('Set a strong ADMIN_PASSWORD before running the seed')
  const email = process.env.ADMIN_EMAIL ?? 'admin@servio.local'
  await prisma.user.upsert({
    where: { email },
    update: { ipName: 'ЦТО БАЗИС', role: Role.ADMIN, status: UserStatus.ACTIVE },
    create: { ipName: 'ЦТО БАЗИС', email, phone: '+7 000 000-00-00', passwordHash: await bcrypt.hash(password, 12), role: Role.ADMIN, status: UserStatus.ACTIVE },
  })
  await prisma.requestType.createMany({ data: [
    { name: 'Не работает касса', color: '#ee7d6a' },
    { name: 'Ошибка при закрытии смены', color: '#8979cf' },
    { name: 'Подключение к ОФД', color: '#60a3da' },
    { name: 'Плановое обслуживание', color: '#60bb94' },
  ], skipDuplicates: true })
}

main().then(() => prisma.$disconnect()).catch(async (error) => { console.error(error); await prisma.$disconnect(); process.exit(1) })
