export const requestTypeInclude = {
  department: true,
  componentRequirements: {
    include: { component: true },
    orderBy: { component: { name: "asc" as const } },
  },
} as const;
