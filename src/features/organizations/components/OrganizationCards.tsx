import { Building2, Check, Trash2 } from "lucide-react";
import { Button } from "../../../components/ui";
import { can } from "../../../auth/permissions";
import type { Organization, User } from "../../../types";

export function OrganizationCards({
  organizations,
  user,
  canApprove,
  openStores,
  approve,
  reject,
  remove,
  deletingId,
}: {
  organizations: Organization[];
  user: User;
  canApprove: boolean;
  openStores: (id: number) => void;
  approve: (id: number) => void;
  reject: (id: number) => void;
  remove: (organization: Organization) => void;
  deletingId: number | null;
}) {
  return (
    <div className="store-grid">
      {[...organizations]
        .sort(
          (left, right) =>
            Number(right.status === "PENDING") -
            Number(left.status === "PENDING"),
        )
        .map((organization) => (
          <article
            className={
              "store-card clickable-card" +
              (organization.status === "PENDING" ? " pending-card" : "")
            }
            onClick={() => openStores(organization.id)}
            onKeyDown={(event) => {
              if (event.key === "Enter" || event.key === " ") {
                event.preventDefault();
                openStores(organization.id);
              }
            }}
            role="button"
            tabIndex={0}
            key={organization.id}
          >
            <div className="store-card-head">
              <span className="store-icon">
                <Building2 />
              </span>
              <span
                className={"store-status " + organization.status.toLowerCase()}
              >
                {organization.status === "ACTIVE"
                  ? "Активна"
                  : organization.status === "PENDING"
                    ? "На модерации"
                    : "Отклонена"}
              </span>
            </div>
            <h3>{organization.legalName}</h3>
            <p>
              {organization.type === "IP"
                ? "ИП"
                : organization.type === "OOO"
                  ? "ООО"
                  : "Организация"}{" "}
              {organization.inn && "· ИНН " + organization.inn}
            </p>
            <p>
              {organization.contacts?.length
                ? organization.contacts
                    .map(
                      (contact) =>
                        `${contact.fullName}${contact.phone ? " · " + contact.phone : ""}`,
                    )
                    .join("; ")
                : organization.contactName ||
                  organization.phone ||
                  organization.email ||
                  "Контакты не указаны"}
            </p>
            <div className="store-metrics">
              <span>
                <b>{organization.stores?.length ?? 0}</b> точек
              </span>
              <span>
                <b>{organization._count?.requests ?? 0}</b> заявок
              </span>
            </div>
            {canApprove && organization.status === "PENDING" && (
              <div className="moderation-actions">
                <Button
                  kind="secondary"
                  onClick={(event) => {
                    event.stopPropagation();
                    void approve(organization.id);
                  }}
                >
                  <Check /> Принять{" "}
                  {organization.type === "IP" ? "ИП" : "организацию"}
                </Button>
                <Button
                  kind="secondary"
                  onClick={(event) => {
                    event.stopPropagation();
                    void reject(organization.id);
                  }}
                >
                  Отклонить
                </Button>
              </div>
            )}
            {can(user, "DELETE_ORGANIZATIONS") && (
              <div className="moderation-actions">
                <Button
                  kind="danger"
                  disabled={deletingId === organization.id}
                  onClick={(event) => {
                    event.stopPropagation();
                    void remove(organization);
                  }}
                >
                  <Trash2 />
                  {deletingId === organization.id ? "Удаление…" : "Удалить"}
                </Button>
              </div>
            )}
            <small className="card-hint">Открыть торговые точки →</small>
          </article>
        ))}
    </div>
  );
}
