import { Building2, Check, Store as StoreIcon, Trash2 } from "lucide-react";
import { Button } from "../../components/ui";
import { can } from "../../auth/permissions";
import { StoreAccessLinks } from "./StoreAccessLinks";
import type { Organization, Store, User } from "../../types";

type StoreGroup = { organization: Organization; stores: Store[] };

export function StoreGroups({
  groups,
  user,
  deletingId,
  select,
  approve,
  reject,
  remove,
}: {
  groups: StoreGroup[];
  user: User;
  deletingId: number | null;
  select: (store: Store) => void;
  approve: (storeId: number) => void;
  reject: (storeId: number) => void;
  remove: (store: Store) => void;
}) {
  return (
    <>
      {groups.map((group) => (
        <section className="store-group" key={group.organization.id}>
          <div className="store-group-head">
            <span className="store-icon">
              <Building2 />
            </span>
            <div>
              <h2>{group.organization.legalName}</h2>
              <p>
                {group.stores.length} точек · ИНН{" "}
                {group.organization.inn || "не указан"}
              </p>
            </div>
          </div>
          <div className="store-grid">
            {group.stores.map((store) => (
              <article
                className={
                  "store-card clickable-card" +
                  (store.status === "PENDING" ? " pending-card" : "")
                }
                onClick={() => select(store)}
                onKeyDown={(event) => {
                  if (event.key === "Enter" || event.key === " ") {
                    event.preventDefault();
                    select(store);
                  }
                }}
                role="button"
                tabIndex={0}
                key={store.id}
              >
                <div className="store-card-head">
                  <span className="store-icon">
                    <StoreIcon />
                  </span>
                  <span
                    className={"store-status " + store.status.toLowerCase()}
                  >
                    {store.status === "ACTIVE"
                      ? "Активна"
                      : store.status === "PENDING"
                        ? "На модерации"
                        : "Отклонена"}
                  </span>
                </div>
                <h3>{store.name}</h3>
                <p>{store.address}</p>
                <p>{store.phone || "Телефон не указан"}</p>
                <div className="store-metrics">
                  <span>
                    <b>{store._count?.requests ?? 0}</b> заявок
                  </span>
                </div>
                <StoreAccessLinks access={store.access} compact />
                {store.status === "PENDING" && (
                  <div className="moderation-actions">
                    <Button
                      kind="secondary"
                      onClick={(event) => {
                        event.stopPropagation();
                        void approve(store.id);
                      }}
                    >
                      <Check /> Принять точку
                    </Button>
                    <Button
                      kind="secondary"
                      onClick={(event) => {
                        event.stopPropagation();
                        void reject(store.id);
                      }}
                    >
                      Отклонить
                    </Button>
                  </div>
                )}
                {can(user, "DELETE_STORES") && (
                  <div className="moderation-actions">
                    <Button
                      kind="danger"
                      disabled={deletingId === store.id}
                      onClick={(event) => {
                        event.stopPropagation();
                        void remove(store);
                      }}
                    >
                      <Trash2 />
                      {deletingId === store.id ? "Удаление…" : "Удалить"}
                    </Button>
                  </div>
                )}
                <small className="card-hint">Открыть подробности →</small>
              </article>
            ))}
          </div>
        </section>
      ))}
    </>
  );
}
