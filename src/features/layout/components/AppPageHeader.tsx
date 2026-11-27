import type { Dispatch, ReactNode, SetStateAction } from "react";
import { Menu, Plus, RefreshCw } from "lucide-react";
import { Button } from "../../../components/ui";
import { roleLabel } from "../../../auth/permissions";
import type { User } from "../../../types";
import type { NavItem } from "./AppSidebar";

export function AppPageHeader({
  nav,
  page,
  user,
  setMobileNav,
  setBoardRefresh,
  load,
  setCalendarDate,
  setCreateRequest,
  children,
}: {
  nav: NavItem[];
  page: string;
  user: User;
  setMobileNav: (open: boolean) => void;
  setBoardRefresh: Dispatch<SetStateAction<number>>;
  load: () => Promise<void>;
  setCalendarDate: (date: Date | null) => void;
  setCreateRequest: (open: boolean) => void;
  children: ReactNode;
}) {
  return (
    <>
      <header>
        <button className="menu-button" onClick={() => setMobileNav(true)}>
          <Menu />
        </button>
        <div className="breadcrumb">
          БАЗИС CRM / {nav.find((n) => n.id === page)?.label}
        </div>
        <div className="header-actions">
          <Button
            kind="secondary"
            onClick={() =>
              page === "my-boards" || page === "team-boards"
                ? setBoardRefresh((value) => value + 1)
                : void load()
            }
          >
            <RefreshCw /> Обновить
          </Button>
        </div>
      </header>
      <div className="page">
        <div className="title-row">
          <div>
            <span className="eyebrow">{roleLabel[user.role]}</span>
            <h1>{nav.find((n) => n.id === page)?.label}</h1>
            <p>
              {page === "dashboard"
                ? "Рабочая картина по доступным вам заявкам."
                : "Данные отображаются с учётом индивидуальных прав."}
            </p>
          </div>
          {page === "requests" && (
            <Button
              onClick={() => {
                setCalendarDate(null);
                setCreateRequest(true);
              }}
            >
              <Plus /> Новая заявка
            </Button>
          )}
        </div>
        {children}
      </div>
    </>
  );
}
