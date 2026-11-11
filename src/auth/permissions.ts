import type { PermissionKey, User } from "../types";

export const permissionLabels: Record<PermissionKey, string> = {
  VIEW_ALL_REQUESTS: "Просмотр всех заявок",
  MANAGE_REQUESTS: "Управление заявками",
  CANCEL_REQUESTS: "Отмена заявок",
  TRANSFER_REQUESTS: "Перенос между отделами",
  SET_PRIORITY: "Управление приоритетом",
  ASSIGN_MASTERS: "Назначение мастеров",
  MANAGE_CLIENTS: "Управление клиентами",
  MANAGE_ORGANIZATIONS: "Управление организациями",
  MANAGE_STORES: "Управление точками",
  VIEW_STORE_SECRETS: "Реквизиты и пароли точек",
  VIEW_TELEGRAM: "Работа с Telegram",
  SEND_TELEGRAM: "Отправка сообщений",
  MANAGE_TEMPLATES: "Управление шаблонами",
  VIEW_REPORTS: "Просмотр отчётов",
  MANAGE_STAFF: "Управление сотрудниками и правами",
  MANAGE_KNOWLEDGE: "Полный доступ к базе знаний",
  DELETE_ORGANIZATIONS: "Полное удаление организаций",
  DELETE_STORES: "Полное удаление торговых точек",
  DELETE_REQUESTS: "Полное удаление заявок",
};
export const permissionGroups: Array<{
  title: string;
  description: string;
  permissions: PermissionKey[];
}> = [
  {
    title: "Заявки",
    description: "Работа с обращениями, приоритетами и исполнителями.",
    permissions: [
      "VIEW_ALL_REQUESTS",
      "MANAGE_REQUESTS",
      "CANCEL_REQUESTS",
      "TRANSFER_REQUESTS",
      "SET_PRIORITY",
      "ASSIGN_MASTERS",
      "DELETE_REQUESTS",
    ],
  },
  {
    title: "Клиенты и объекты",
    description: "Клиенты, организации, торговые точки и доступы к ним.",
    permissions: [
      "MANAGE_CLIENTS",
      "MANAGE_ORGANIZATIONS",
      "MANAGE_STORES",
      "VIEW_STORE_SECRETS",
      "DELETE_ORGANIZATIONS",
      "DELETE_STORES",
    ],
  },
  {
    title: "Telegram и отчёты",
    description: "Рабочие чаты, отправка сообщений и аналитика.",
    permissions: ["VIEW_TELEGRAM", "SEND_TELEGRAM", "VIEW_REPORTS"],
  },
  {
    title: "Администрирование",
    description: "Настройка шаблонов и сотрудников CRM.",
    permissions: ["MANAGE_TEMPLATES", "MANAGE_STAFF"],
  },
  {
    title: "База знаний",
    description: "Разделы, статьи и прикреплённые материалы.",
    permissions: ["MANAGE_KNOWLEDGE"],
  },
];
export const defaultPermissions: Record<User["role"], PermissionKey[]> = {
  DIRECTOR: Object.keys(permissionLabels) as PermissionKey[],
  DEPARTMENT_HEAD: [
    "MANAGE_REQUESTS",
    "CANCEL_REQUESTS",
    "TRANSFER_REQUESTS",
    "SET_PRIORITY",
    "ASSIGN_MASTERS",
    "VIEW_STORE_SECRETS",
    "VIEW_TELEGRAM",
    "SEND_TELEGRAM",
    "MANAGE_TEMPLATES",
    "VIEW_REPORTS",
    "MANAGE_KNOWLEDGE",
  ],
  MASTER: [
    "MANAGE_REQUESTS",
    "VIEW_STORE_SECRETS",
    "VIEW_TELEGRAM",
    "SEND_TELEGRAM",
    "VIEW_REPORTS",
    "MANAGE_KNOWLEDGE",
  ],
  CLIENT: [],
};

export function can(user: User, key: PermissionKey) {
  const overrides = new Map(
    user.permissionOverrides?.map((item) => [item.permission, item.enabled]),
  );
  return overrides.get(key) ?? defaultPermissions[user.role].includes(key);
}

export const roleLabel = {
  CLIENT: "Клиент",
  DIRECTOR: "Руководитель",
  DEPARTMENT_HEAD: "Начальник отдела",
  MASTER: "Мастер",
} as const;
