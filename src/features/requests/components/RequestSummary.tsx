import { StoreAccessLinks } from "../../stores/components/StoreAccessLinks";
import { RequestTemplateData } from "./RequestTemplateData";
import { formatDate } from "../../../shared/formatDate";
import type { ServiceRequest } from "../../../types";

export function RequestSummary({ item }: { item: ServiceRequest }) {
  return (
    <>
      <div className="detail-grid">
        <div>
          <small>Клиент / организация</small>
          <b>
            {item.organization?.legalName ??
              item.createdBy?.ipName ??
              "Новый контакт"}
          </b>
        </div>
        <div>
          <small>Точка</small>
          <b>{item.store?.name ?? "Не выбрана"}</b>
          <span>{item.store?.address}</span>
        </div>
        <div>
          <small>Отдел</small>
          <b>{item.department.name}</b>
        </div>
        <div>
          <small>Тип и источник</small>
          <b>{item.type.name}</b>
          <span>
            {item.source === "WEB"
              ? "Сайт"
              : item.source === "TELEGRAM_BOT"
                ? "Telegram-бот"
                : "Telegram"}
          </span>
        </div>
        <div>
          <small>Создана</small>
          <b>{formatDate(item.createdAt)}</b>
        </div>
        <div>
          <small>Исполнители</small>
          <b>
            {item.assignees.length
              ? item.assignees.map((a) => a.user.ipName).join(", ")
              : "Не назначены"}
          </b>
        </div>
      </div>
      <div className="description-box">
        <small>Описание</small>
        <p>{item.description}</p>
      </div>
      {item.store?.access && (
        <section className="request-store-links">
          <small>Быстрые доступы точки</small>
          <StoreAccessLinks access={item.store.access} />
        </section>
      )}
      <RequestTemplateData item={item} />
    </>
  );
}
