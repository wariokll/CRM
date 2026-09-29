import bcrypt from 'bcrypt'
import { PrismaClient, Role, UserStatus } from '@prisma/client'

const prisma = new PrismaClient()

async function main() {
  const adminEmail = (process.env.ADMIN_EMAIL ?? 'admin@bazis.ru').toLowerCase()
  const adminPassword = process.env.ADMIN_PASSWORD ?? 'admin'
  const clientEmail = (process.env.DEMO_USER_EMAIL ?? 'user@bazis.ru').toLowerCase()
  const clientPassword = process.env.DEMO_USER_PASSWORD ?? 'user'
  const [adminPasswordHash, clientPasswordHash] = await Promise.all([
    bcrypt.hash(adminPassword, 12),
    bcrypt.hash(clientPassword, 12),
  ])

  const currentAdmin = await prisma.user.findUnique({ where: { email: adminEmail } })
    ?? await prisma.user.findUnique({ where: { email: 'admin@servio.local' } })
  if (currentAdmin) {
    await prisma.user.update({
      where: { id: currentAdmin.id },
      data: { email: adminEmail, passwordHash: adminPasswordHash, ipName: 'ЦТО БАЗИС', role: Role.ADMIN, status: UserStatus.ACTIVE },
    })
  } else {
    await prisma.user.create({
      data: { ipName: 'ЦТО БАЗИС', email: adminEmail, phone: '+7 000 000-00-00', passwordHash: adminPasswordHash, role: Role.ADMIN, status: UserStatus.ACTIVE },
    })
  }

  const currentClient = await prisma.user.findUnique({ where: { email: clientEmail } })
    ?? await prisma.user.findUnique({ where: { email: 'demo@servio.local' } })
  if (currentClient) {
    await prisma.user.update({
      where: { id: currentClient.id },
      data: { email: clientEmail, passwordHash: clientPasswordHash, ipName: 'ИП Демо', role: Role.CLIENT, status: UserStatus.ACTIVE },
    })
  } else {
    await prisma.user.create({
      data: { ipName: 'ИП Демо', email: clientEmail, phone: '+7 000 000-00-01', passwordHash: clientPasswordHash, role: Role.CLIENT, status: UserStatus.ACTIVE },
    })
  }

  await prisma.requestType.createMany({ data: [
    { name: 'Не работает касса', color: '#ee7d6a' },
    { name: 'Ошибка при закрытии смены', color: '#8979cf' },
    { name: 'Подключение к ОФД', color: '#60a3da' },
    { name: 'Плановое обслуживание', color: '#60bb94' },
  ], skipDuplicates: true })
}

main().then(() => prisma.$disconnect()).catch(async (error) => { console.error(error); await prisma.$disconnect(); process.exit(1) })
