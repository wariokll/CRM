export const requestInclude = {
  store: {
    include: {
      organization: true,
      access: {
        select: {
          anydeskId: true,
          ofdUrl: true,
          ofdLogin: true,
          nalogUrl: true,
          nalogLogin: true,
          updatedAt: true,
        },
      },
    },
  },
  organization: true,
  type: { include: { department: true } },
  department: true,
  createdBy: { select: { id: true, ipName: true, phone: true, email: true } },
  contact: true,
  recurrenceSchedule: {
    select: {
      id: true,
      intervalDays: true,
      nextScheduledAt: true,
      isActive: true,
    },
  },
  assignees: {
    include: {
      user: {
        select: {
          id: true,
          ipName: true,
          email: true,
          phone: true,
          role: true,
        },
      },
    },
    orderBy: { assignedAt: "asc" as const },
  },
  comments: {
    include: { author: { select: { id: true, ipName: true, role: true } } },
    orderBy: { createdAt: "asc" as const },
  },
  departmentHistory: {
    include: {
      fromDepartment: true,
      toDepartment: true,
      transferredBy: { select: { id: true, ipName: true } },
    },
    orderBy: { createdAt: "asc" as const },
  },
  activities: {
    include: { author: { select: { id: true, ipName: true, role: true } } },
    orderBy: { createdAt: "asc" as const },
  },
} as const;
