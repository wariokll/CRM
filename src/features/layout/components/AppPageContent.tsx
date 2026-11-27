import { lazy, Suspense } from "react";
import type {
  Department,
  Organization,
  RequestType,
  ServiceRequest,
  StaffMember,
  Store,
  TelegramChat,
  TelegramIntegration,
  User,
} from "../../../types";
import { LoadingState } from "../../../components/ui";

const RequestsList = lazy(() =>
  import("../../requests/components/RequestsList").then((module) => ({
    default: module.RequestsList,
  })),
);
const CalendarPage = lazy(() =>
  import("../../requests/pages/CalendarPage").then((module) => ({
    default: module.CalendarPage,
  })),
);
const OrganizationsPage = lazy(() =>
  import("../../organizations/pages/OrganizationsPage").then((module) => ({
    default: module.OrganizationsPage,
  })),
);
const StoresPage = lazy(() =>
  import("../../stores/pages/StoresPage").then((module) => ({
    default: module.StoresPage,
  })),
);
const TemplatesPage = lazy(() =>
  import("../../templates/pages/TemplatesPage").then((module) => ({
    default: module.TemplatesPage,
  })),
);
const StaffPage = lazy(() =>
  import("../../staff/pages/StaffPage").then((module) => ({
    default: module.StaffPage,
  })),
);
const TelegramPage = lazy(() =>
  import("../../telegram/pages/TelegramPage").then((module) => ({
    default: module.TelegramPage,
  })),
);
const ReportsPage = lazy(() =>
  import("../../reports/pages/ReportsPage").then((module) => ({
    default: module.ReportsPage,
  })),
);
const BoardsPage = lazy(() =>
  import("../../boards/pages/BoardsPage").then((module) => ({
    default: module.BoardsPage,
  })),
);
const KnowledgePage = lazy(() =>
  import("../../knowledge/pages/KnowledgePage").then((module) => ({
    default: module.KnowledgePage,
  })),
);
const DashboardPage = lazy(() =>
  import("../../dashboard/pages/DashboardPage").then((module) => ({
    default: module.DashboardPage,
  })),
);

type Props = {
  page: string;
  user: User;
  requests: ServiceRequest[];
  stores: Store[];
  organizations: Organization[];
  types: RequestType[];
  departments: Department[];
  staff: StaffMember[];
  integrations: TelegramIntegration[];
  chats: TelegramChat[];
  load: () => void;
  storeOrganizationId: number | null;
  boardRefresh: number;
  onOpenRequest: (item: ServiceRequest) => void;
  onAddRequest: (date: Date | null) => void;
  openStores: (id: number) => void;
  setStoreOrganizationId: (id: number | null) => void;
};

export function AppPageContent(props: Props) {
  const {
    page,
    user,
    requests,
    stores,
    organizations,
    types,
    departments,
    staff,
    integrations,
    chats,
    load,
    storeOrganizationId,
    boardRefresh,
    onOpenRequest,
    onAddRequest,
    openStores,
    setStoreOrganizationId,
  } = props;
  return (
    <Suspense fallback={<LoadingState>Загрузка раздела…</LoadingState>}>
      {page === "requests" ? (
        <RequestsList
          requests={requests}
          user={user}
          departments={departments}
          types={types}
          open={onOpenRequest}
        />
      ) : page === "calendar" ? (
        <CalendarPage
          requests={requests}
          open={onOpenRequest}
          add={onAddRequest}
        />
      ) : page === "organizations" ? (
        <OrganizationsPage
          organizations={organizations}
          user={user}
          reload={load}
          openStores={openStores}
        />
      ) : page === "stores" ? (
        <StoresPage
          stores={stores}
          organizations={organizations}
          user={user}
          reload={load}
          organizationFilter={storeOrganizationId}
          setOrganizationFilter={setStoreOrganizationId}
        />
      ) : page === "my-boards" ? (
        <BoardsPage
          key="my-boards"
          user={user}
          type="PERSONAL"
          refreshKey={boardRefresh}
        />
      ) : page === "team-boards" ? (
        <BoardsPage
          key="team-boards"
          user={user}
          type="TEAM"
          refreshKey={boardRefresh}
        />
      ) : page === "reports" ? (
        <ReportsPage />
      ) : page === "templates" ? (
        <TemplatesPage types={types} departments={departments} reload={load} />
      ) : page === "staff" ? (
        <StaffPage staff={staff} departments={departments} reload={load} />
      ) : page === "telegram" ? (
        <TelegramPage
          integrations={integrations}
          chats={chats}
          organizations={organizations}
          stores={stores}
          reload={load}
        />
      ) : page === "knowledge" ? (
        <KnowledgePage />
      ) : (
        <DashboardPage
          requests={requests}
          stores={stores}
          openRequest={onOpenRequest}
        />
      )}
    </Suspense>
  );
}
