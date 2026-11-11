export const staffSelect = {
  id: true,
  ipName: true,
  email: true,
  phone: true,
  role: true,
  status: true,
  createdAt: true,
  departmentMemberships: { include: { department: true } },
  permissionOverrides: true,
  linkedTelegramChats: {
    where: { integration: { kind: "BOT" } },
    select: { id: true, title: true, username: true },
  },
} as const;
