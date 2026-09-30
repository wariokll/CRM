import bcrypt from 'bcrypt'
import { OrganizationStatus, OrganizationType, PrismaClient, Role, StoreStatus, UserStatus } from '@prisma/client'

const prisma = new PrismaClient()

async function main() {
  const subscriber = await prisma.department.upsert({ where: { slug: 'subscriber' }, update: { name: 'Абонентский', isActive: true }, create: { slug: 'subscriber', name: 'Абонентский' } })
  const service = await prisma.department.upsert({ where: { slug: 'service' }, update: { name: 'Сервисный', isActive: true }, create: { slug: 'service', name: 'Сервисный' } })
  await prisma.department.upsert({ where: { slug: 'sales' }, update: { name: 'Торговый', isActive: true }, create: { slug: 'sales', name: 'Торговый' } })
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
      data: { email: adminEmail, passwordHash: adminPasswordHash, ipName: 'ЦТО БАЗИС', role: Role.DIRECTOR, status: UserStatus.ACTIVE },
    })
  } else {
    await prisma.user.create({
      data: { ipName: 'ЦТО БАЗИС', email: adminEmail, phone: '+7 000 000-00-00', passwordHash: adminPasswordHash, role: Role.DIRECTOR, status: UserStatus.ACTIVE },
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

  const client = await prisma.user.findUniqueOrThrow({ where: { email: clientEmail } })
  const existingOrganization = await prisma.organization.findFirst({ where: { members: { some: { userId: client.id } } } })
  if (!existingOrganization) {
    await prisma.organization.create({ data: {
      type: OrganizationType.IP,
      legalName: 'ИП Демо',
      shortName: 'ИП Демо',
      phone: client.phone,
      email: client.email,
      status: OrganizationStatus.ACTIVE,
      createdByUserId: client.id,
      members: { create: { userId: client.id, isPrimary: true } },
      stores: { create: { name: 'Демо-точка', address: 'г. Москва, демонстрационный адрес', phone: client.phone, userId: client.id, status: StoreStatus.ACTIVE } },
    } })
  }

  await prisma.requestType.createMany({ data: [
    { name: 'Не работает касса', color: '#ee7d6a', departmentId: service.id },
    { name: 'Ошибка при закрытии смены', color: '#8979cf', departmentId: service.id },
    { name: 'Подключение к ОФД', color: '#60a3da', departmentId: subscriber.id },
    { name: 'Плановое обслуживание', color: '#60bb94', departmentId: service.id },
    { name: 'Консультация', color: '#5b8def', departmentId: subscriber.id, requiresOrganization: false, requiresStore: false },
  ], skipDuplicates: true })

  await prisma.telegramIntegration.createMany({ data: [{ kind: 'USER_ACCOUNT' }, { kind: 'BOT' }], skipDuplicates: true })
}

main().then(() => prisma.$disconnect()).catch(async (error) => { console.error(error); await prisma.$disconnect(); process.exit(1) })
