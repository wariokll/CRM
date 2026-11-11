export const queryKeys = {
  app: {
    user: (userId: number) => ["app", userId] as const,
    requests: (userId: number) => ["app", userId, "requests"] as const,
    stores: (userId: number) => ["app", userId, "stores"] as const,
    organizations: (userId: number) =>
      ["app", userId, "organizations"] as const,
    requestTypes: (userId: number) => ["app", userId, "request-types"] as const,
    departments: (userId: number) => ["app", userId, "departments"] as const,
    staff: (userId: number) => ["app", userId, "staff"] as const,
    telegramIntegrations: (userId: number) =>
      ["app", userId, "telegram-integrations"] as const,
    telegramChats: (userId: number) =>
      ["app", userId, "telegram-chats"] as const,
  },
  reports: {
    root: ["reports"] as const,
    data: (from: string, to: string, componentId: string) =>
      ["reports", from, to, componentId] as const,
  },
  components: { all: ["components"] as const },
  boards: {
    all: (type: "PERSONAL" | "TEAM") => ["boards", type] as const,
    detail: (type: "PERSONAL" | "TEAM", id: number) =>
      ["boards", type, id] as const,
  },
  knowledge: {
    sections: ["knowledge", "sections"] as const,
    articles: ["knowledge", "articles"] as const,
    articleList: (sectionId: number | null, search: string) =>
      ["knowledge", "articles", sectionId, search] as const,
    article: (id: number) => ["knowledge", "article", id] as const,
  },
};
