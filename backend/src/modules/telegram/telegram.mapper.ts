export const telegramChatInclude = {
  integration: true,
  linkedUser: { select: { id: true, ipName: true, email: true } },
  organization: true,
  store: true,
  organizationLinks: {
    include: { organization: { select: { id: true, legalName: true } } },
    orderBy: { organization: { legalName: "asc" as const } },
  },
  storeLinks: {
    include: {
      store: {
        select: { id: true, name: true, address: true, organizationId: true },
      },
    },
    orderBy: { store: { name: "asc" as const } },
  },
  contact: true,
  messages: { take: 1, orderBy: { sentAt: "desc" as const } },
} as const;

export const telegramChatLinksInclude = {
  organizationLinks: {
    include: { organization: { select: { id: true, legalName: true } } },
  },
  storeLinks: {
    include: {
      store: {
        select: { id: true, name: true, address: true, organizationId: true },
      },
    },
  },
} as const;
