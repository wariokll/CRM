import {
  BookOpen,
  Building2,
  CalendarDays,
  ClipboardList,
  Columns3,
  FileText,
  LayoutDashboard,
  ListTodo,
  MessageCircle,
  Settings2,
  Store as StoreIcon,
  Users,
} from "lucide-react";
import { can } from "../../auth/permissions";
import type { User } from "../../types";
import type { NavItem } from "./components/AppSidebar";

export function buildNavigation(user: User): NavItem[] {
  return [
    { id: "dashboard", label: "Обзор", Icon: LayoutDashboard },
    { id: "requests", label: "Заявки", Icon: ClipboardList },
    { id: "calendar", label: "Календарь", Icon: CalendarDays },
    { id: "organizations", label: "Организации", Icon: Building2 },
    { id: "stores", label: "Торговые точки", Icon: StoreIcon },
    ...(user.role !== "CLIENT"
      ? [
          { id: "my-boards", label: "Мои доски", Icon: ListTodo },
          { id: "team-boards", label: "Доски", Icon: Columns3 },
        ]
      : []),
    ...(can(user, "VIEW_REPORTS")
      ? [{ id: "reports", label: "Отчёты", Icon: FileText }]
      : []),
    ...(can(user, "MANAGE_TEMPLATES")
      ? [{ id: "templates", label: "Шаблоны", Icon: Settings2 }]
      : []),
    ...(can(user, "MANAGE_STAFF")
      ? [{ id: "staff", label: "Сотрудники", Icon: Users }]
      : []),
    ...(can(user, "VIEW_TELEGRAM")
      ? [{ id: "telegram", label: "Telegram", Icon: MessageCircle }]
      : []),
    ...(can(user, "MANAGE_KNOWLEDGE")
      ? [{ id: "knowledge", label: "База знаний", Icon: BookOpen }]
      : []),
  ];
}
