import type { PrismaClient } from "@prisma/client";

export function createBotTargetResolver(prisma: PrismaClient) {
  type TargetOrganization = { id: number; legalName: string; status: string };
  type TargetStore = {
    id: number;
    name: string;
    address: string | null;
    organizationId: number;
    status: string;
  };
  type TargetChatLinks = {
    organizationId: number | null;
    linkedUserId: number | null;
    storeId: number | null;
    organizationLinks: Array<{ organization: TargetOrganization }>;
    storeLinks: Array<{ store: TargetStore }>;
  };

  async function linkedTargetOrganizations(chat: TargetChatLinks) {
    const organizationMap = new Map(
      chat.organizationLinks
        .filter((link) => link.organization.status === "ACTIVE")
        .map((link) => [link.organization.id, link.organization]),
    );
    if (chat.organizationId) {
      const organization = await prisma.organization.findUnique({
        where: { id: chat.organizationId },
        select: { id: true, legalName: true, status: true },
      });
      if (organization?.status === "ACTIVE")
        organizationMap.set(organization.id, organization);
    }
    if (!organizationMap.size && chat.linkedUserId) {
      const organizations = await prisma.organization.findMany({
        where: {
          status: "ACTIVE",
          members: { some: { userId: chat.linkedUserId } },
        },
        select: { id: true, legalName: true, status: true },
      });
      organizations.forEach((organization) =>
        organizationMap.set(organization.id, organization),
      );
    }
    return organizationMap;
  }

  async function linkedTargetStores(
    chat: TargetChatLinks,
    organizationMap: Map<number, TargetOrganization>,
  ) {
    const linkedStores = chat.storeLinks
      .map((link) => link.store)
      .filter((store) => store.status === "ACTIVE");
    if (chat.storeId) {
      const store = await prisma.store.findUnique({
        where: { id: chat.storeId },
        select: {
          id: true,
          name: true,
          address: true,
          organizationId: true,
          status: true,
        },
      });
      if (
        store?.status === "ACTIVE" &&
        !linkedStores.some((item) => item.id === store.id)
      )
        linkedStores.push(store);
    }
    linkedStores.forEach((store) => {
      if (!organizationMap.has(store.organizationId))
        organizationMap.set(store.organizationId, {
          id: store.organizationId,
          legalName: "Организация точки",
          status: "ACTIVE",
        });
    });
    return linkedStores;
  }

  async function selectRequestTarget(
    type: { requiresOrganization: boolean; requiresStore: boolean },
    organizations: TargetOrganization[],
    linkedStores: TargetStore[],
  ) {
    if (!type.requiresOrganization && !type.requiresStore)
      return { kind: "ready" as const };
    if (type.requiresStore) {
      const stores = linkedStores.length
        ? linkedStores
        : await prisma.store.findMany({
            where: {
              organizationId: {
                in: organizations.map((organization) => organization.id),
              },
              status: "ACTIVE",
            },
            select: {
              id: true,
              name: true,
              address: true,
              organizationId: true,
              status: true,
            },
            orderBy: { name: "asc" },
          });
      if (!stores.length) return { kind: "missing" as const };
      if (stores.length === 1) {
        const [store] = stores;
        if (!store) return { kind: "missing" as const };
        return {
          kind: "ready" as const,
          organizationId: store.organizationId,
          storeId: store.id,
        };
      }
      return { kind: "stores" as const, stores };
    }
    if (organizations.length === 1) {
      const [organization] = organizations;
      if (!organization) return { kind: "missing" as const };
      return { kind: "ready" as const, organizationId: organization.id };
    }
    if (organizations.length > 1)
      return { kind: "organizations" as const, organizations };
    return { kind: "missing" as const };
  }

  async function resolveTarget(
    chatId: number,
    type: { requiresOrganization: boolean; requiresStore: boolean },
  ) {
    const chat = await prisma.telegramChat.findUnique({
      where: { id: chatId },
      include: {
        organizationLinks: {
          include: {
            organization: {
              select: { id: true, legalName: true, status: true },
            },
          },
        },
        storeLinks: {
          include: {
            store: {
              select: {
                id: true,
                name: true,
                address: true,
                organizationId: true,
                status: true,
              },
            },
          },
        },
      },
    });
    if (!chat) return { kind: "missing" as const };
    const organizationMap = await linkedTargetOrganizations(chat);
    const linkedStores = await linkedTargetStores(chat, organizationMap);
    return selectRequestTarget(
      type,
      [...organizationMap.values()],
      linkedStores,
    );
  }

  return { resolveTarget };
}
