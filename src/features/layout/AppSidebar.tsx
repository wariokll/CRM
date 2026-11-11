import { LogOut, type LucideIcon } from "lucide-react";
import { roleLabel } from "../../auth/permissions";
import bazisLogo from "../../assets/bazis-logo.svg";
import type { User } from "../../types";

export type NavItem = { id: string; label: string; Icon: LucideIcon };

function Brand() {
  return (
    <div className="brand">
      <img src={bazisLogo} alt="БАЗИС CRM" />
    </div>
  );
}

export function AppSidebar({
  nav,
  page,
  user,
  mobileNav,
  setMobileNav,
  setPage,
  setStoreOrganizationId,
  urgent,
  pendingOrganizations,
  pendingStores,
  exit,
}: {
  nav: NavItem[];
  page: string;
  user: User;
  mobileNav: boolean;
  setMobileNav: (open: boolean) => void;
  setPage: (page: string) => void;
  setStoreOrganizationId: (id: number | null) => void;
  urgent: number;
  pendingOrganizations: number;
  pendingStores: number;
  exit: () => void;
}) {
  return (
    <>
      <aside className={`sidebar ${mobileNav ? "open" : ""}`}>
        <Brand />
        <div className="workspace">
          <span>{user.ipName.slice(0, 1)}</span>
          <div>
            <small>РАБОЧЕЕ ПРОСТРАНСТВО</small>
            <b>{user.role === "CLIENT" ? user.ipName : "ЦТО БАЗИС"}</b>
          </div>
        </div>
        <nav>
          {nav.map(({ id, label, Icon }) => (
            <button
              className={page === id ? "active" : ""}
              onClick={() => {
                if (id === "stores") setStoreOrganizationId(null);
                setPage(id);
                setMobileNav(false);
              }}
              key={id}
            >
              <Icon />
              <span>{label}</span>
              {((id === "requests" && urgent > 0) ||
                (id === "organizations" && pendingOrganizations > 0) ||
                (id === "stores" && pendingStores > 0)) && (
                <em>
                  {id === "requests"
                    ? urgent
                    : id === "organizations"
                      ? pendingOrganizations
                      : pendingStores}
                </em>
              )}
            </button>
          ))}
        </nav>
        <div className="sidebar-footer">
          <span className="avatar">
            {user.ipName.slice(0, 2).toUpperCase()}
          </span>
          <div>
            <b>{user.ipName}</b>
            <small>{roleLabel[user.role]}</small>
          </div>
          <button onClick={exit}>
            <LogOut />
          </button>
        </div>
      </aside>
      {mobileNav && (
        <button className="nav-scrim" onClick={() => setMobileNav(false)} />
      )}
    </>
  );
}
