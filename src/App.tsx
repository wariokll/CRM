import { useEffect, useState } from "react";
import {
  Navigate,
  useLocation,
  useNavigate,
  useSearchParams,
} from "react-router-dom";
import { RefreshCw } from "lucide-react";
import { logout } from "./api";
import { useAuth } from "./auth/AuthContext";
import { AuthPage } from "./features/auth/AuthPage";
import { AppSidebar } from "./features/layout/AppSidebar";
import { AppPageContent } from "./features/layout/AppPageContent";
import { AppPageHeader } from "./features/layout/AppPageHeader";
import { buildNavigation } from "./features/layout/navigation";
import { AccountStatusPage } from "./features/layout/AccountStatusPage";
import { RequestModal } from "./features/requests/RequestModal";
import { CreateRequestForm } from "./features/requests/CreateRequestForm";
import { useAppData } from "./features/layout/useAppData";
import "./recurrence.css";
import type { ServiceRequest } from "./types";

export function AppContent() {
  const { user, setUser, booting } = useAuth();
  const location = useLocation();
  const navigate = useNavigate();
  const routeParts = location.pathname.split("/").filter(Boolean);
  const routePage = routeParts[0] ?? "dashboard";
  const [searchParams, setSearchParams] = useSearchParams();
  const [page, setPageState] = useState(routePage),
    [mobileNav, setMobileNav] = useState(false),
    [createRequest, setCreateRequest] = useState(false),
    [calendarDate, setCalendarDate] = useState<Date | null>(null),
    [boardRefresh, setBoardRefresh] = useState(0);
  const setPage = (nextPage: string) => {
    setPageState(nextPage);
    navigate(nextPage === "dashboard" ? "/" : `/${nextPage}`);
  };
  useEffect(() => setPageState(routePage), [routePage]);
  const storeOrganizationId =
    routePage === "stores"
      ? Number(searchParams.get("organizationId")) || null
      : null;
  const setStoreOrganizationId = (id: number | null) => {
    setSearchParams((current) => {
      const next = new URLSearchParams(current);
      if (id === null) next.delete("organizationId");
      else next.set("organizationId", String(id));
      return next;
    });
  };
  const {
    requests,
    stores,
    organizations,
    types,
    departments,
    staff,
    integrations,
    chats,
    load,
    loadError,
  } = useAppData(user);
  const requestId =
    Number(routeParts[1]) || Number(searchParams.get("requestId")) || null;
  const selected = requests.find((item) => item.id === requestId) ?? null;
  const openRequest = (item: ServiceRequest) => {
    if (routePage === "requests") navigate(`/requests/${item.id}`);
    else
      setSearchParams((current) => {
        const next = new URLSearchParams(current);
        next.set("requestId", String(item.id));
        return next;
      });
  };
  const closeRequest = () => {
    if (routePage === "requests" && routeParts.length > 1)
      navigate("/requests");
    else
      setSearchParams((current) => {
        const next = new URLSearchParams(current);
        next.delete("requestId");
        return next;
      });
  };
  const exit = async () => {
    await logout();
    setUser(null);
  };
  if (booting)
    return (
      <main className="boot">
        <RefreshCw className="spin" /> Загрузка БАЗИС CRM…
      </main>
    );
  if (!user) return <AuthPage onAuth={setUser} />;
  if (user.status !== "ACTIVE")
    return <AccountStatusPage user={user} exit={exit} />;
  const nav = buildNavigation(user);

  if (page !== "dashboard" && !nav.some((item) => item.id === page))
    return <Navigate to="/" replace />;
  const urgent = requests.filter(
    (r) =>
      r.priority === "CRITICAL" && !["DONE", "CANCELLED"].includes(r.status),
  );
  const pendingOrganizations = organizations.filter(
      (item) => item.status === "PENDING",
    ).length,
    pendingStores = stores.filter((item) => item.status === "PENDING").length;
  const body = (
    <AppPageContent
      page={page}
      user={user}
      requests={requests}
      stores={stores}
      organizations={organizations}
      types={types}
      departments={departments}
      staff={staff}
      integrations={integrations}
      chats={chats}
      load={load}
      storeOrganizationId={storeOrganizationId}
      boardRefresh={boardRefresh}
      onOpenRequest={openRequest}
      onAddRequest={(date) => {
        setCalendarDate(date);
        setCreateRequest(true);
      }}
      openStores={(id) => {
        navigate(`/stores?organizationId=${id}`);
      }}
      setStoreOrganizationId={setStoreOrganizationId}
    />
  );

  return (
    <main className="app-shell">
      <AppSidebar
        nav={nav}
        page={page}
        user={user}
        mobileNav={mobileNav}
        setMobileNav={setMobileNav}
        setPage={setPage}
        setStoreOrganizationId={setStoreOrganizationId}
        urgent={urgent.length}
        pendingOrganizations={pendingOrganizations}
        pendingStores={pendingStores}
        exit={exit}
      />
      <section className="content">
        <AppPageHeader
          nav={nav}
          page={page}
          user={user}
          setMobileNav={setMobileNav}
          setBoardRefresh={setBoardRefresh}
          load={load}
          setCalendarDate={setCalendarDate}
          setCreateRequest={setCreateRequest}
        >
          {loadError && <div className="page-error">{loadError}</div>}
          {body}
        </AppPageHeader>
      </section>
      {selected && (
        <RequestModal
          item={selected}
          user={user}
          departments={departments}
          close={closeRequest}
          reload={load}
        />
      )}
      {createRequest && (
        <CreateRequestForm
          organizations={organizations}
          stores={stores}
          types={types}
          user={user}
          close={() => {
            setCreateRequest(false);
            setCalendarDate(null);
          }}
          reload={load}
          initialUrgency={calendarDate ? "SCHEDULED" : "URGENT"}
          initialScheduledAt={calendarDate}
        />
      )}
    </main>
  );
}
