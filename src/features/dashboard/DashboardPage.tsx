import {
  Activity,
  AlertTriangle,
  ClipboardList,
  Store as StoreIcon,
} from "lucide-react";
import { Empty } from "../../components/ui";
import { RequestCard } from "../requests/RequestCard";
import type { ServiceRequest, Store } from "../../types";

export function DashboardPage({
  requests,
  stores,
  openRequest,
}: {
  requests: ServiceRequest[];
  stores: Store[];
  openRequest: (item: ServiceRequest) => void;
}) {
  const urgent = requests.filter(
    (request) =>
      request.priority === "CRITICAL" &&
      !["DONE", "CANCELLED"].includes(request.status),
  );
  return (
    <>
      <div className="stats-grid">
        <div className="stat-card coral">
          <span>
            <ClipboardList />
          </span>
          <div>
            <small>Все заявки</small>
            <strong>{requests.length}</strong>
          </div>
        </div>
        <div className="stat-card amber">
          <span>
            <AlertTriangle />
          </span>
          <div>
            <small>Критические</small>
            <strong>{urgent.length}</strong>
          </div>
        </div>
        <div className="stat-card green">
          <span>
            <StoreIcon />
          </span>
          <div>
            <small>Активные точки</small>
            <strong>
              {stores.filter((s) => s.status === "ACTIVE").length}
            </strong>
          </div>
        </div>
        <div className="stat-card violet">
          <span>
            <Activity />
          </span>
          <div>
            <small>В работе</small>
            <strong>
              {requests.filter((r) => r.status === "IN_PROGRESS").length}
            </strong>
          </div>
        </div>
      </div>
      <section className="panel table-panel">
        <div className="panel-head">
          <div>
            <h2>Приоритетные заявки</h2>
            <p>Критические и новые обращения</p>
          </div>
        </div>
        <div className="request-grid">
          {requests
            .filter((r) => !["DONE", "CANCELLED"].includes(r.status))
            .slice(0, 6)
            .map((item) => (
              <RequestCard
                key={item.id}
                item={item}
                open={() => openRequest(item)}
              />
            ))}
          {!requests.length && (
            <Empty
              title="Рабочая очередь пуста"
              text="Новые обращения появятся здесь."
            />
          )}
        </div>
      </section>
    </>
  );
}
