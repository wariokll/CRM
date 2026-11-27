import { Building2, Store as StoreIcon } from "lucide-react";
import type { ServiceRequest } from "../../../types";
import { isOverdue, priorityLabel, statusLabel } from "../requestDisplay";

export function RequestCard({
  item,
  open,
}: {
  item: ServiceRequest;
  open: () => void;
}) {
  return (
    <button className="request-card" onClick={open}>
      <div className="request-card-top">
        <span className="type-chip">
          <i style={{ background: item.type.color || "#ee7865" }} />
          {item.type.name}
        </span>
        <span>#{item.id}</span>
      </div>
      <h3>{item.description}</h3>
      <div className="request-meta">
        <span className="request-meta-item">
          <Building2 />
          <span className="request-meta-copy">
            <small>Организация</small>
            <b>
              {item.organization?.legalName ??
                item.createdBy?.ipName ??
                "Консультация"}
            </b>
          </span>
        </span>
        <span className="request-meta-item">
          <StoreIcon />
          <span className="request-meta-copy">
            <small>Точка</small>
            <b>{item.store?.name ?? "Без точки"}</b>
          </span>
        </span>
      </div>
      <div className="request-meta">
        <span className="request-meta-item">
          <span className="request-meta-copy">
            <small>Отдел</small>
            <b>{item.department.name}</b>
          </span>
        </span>
        <span className="request-meta-item">
          <span className="request-meta-copy">
            <small>Исполнитель</small>
            <b>
              {item.assignees.length
                ? item.assignees.map((a) => a.user.ipName).join(", ")
                : "Свободна"}
            </b>
          </span>
        </span>
      </div>
      <div className="request-card-bottom">
        <span className={`urgency ${item.priority.toLowerCase()}`}>
          {priorityLabel[item.priority]}
        </span>
        {isOverdue(item) && <span className="overdue">Просрочена</span>}
        <span className={`status ${item.status.toLowerCase()}`}>
          {statusLabel[item.status]}
        </span>
      </div>
    </button>
  );
}
