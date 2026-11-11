import type { ReactNode } from "react";
import type { RequestStatus, Stats } from "../../types";
import type { ProcurementRow } from "./queries";

export function reportList(
  title: string,
  rows: Array<{ id: number; name: string; count: number }>,
): ReactNode {
  return (
    <section className="panel table-panel">
      <div className="panel-head">
        <h2>{title}</h2>
      </div>
      {rows.length ? (
        <div className="report-list">
          {rows.map((row) => (
            <div key={row.id}>
              <span>{row.name}</span>
              <b>{row.count}</b>
            </div>
          ))}
        </div>
      ) : (
        <p>За выбранный период данных нет.</p>
      )}
    </section>
  );
}

export function RequestsReport({
  rows,
  statuses,
  formatDate,
}: {
  rows: Stats["requests"];
  statuses: Record<RequestStatus, string>;
  formatDate: (value?: string | null) => string;
}) {
  return (
    <section className="panel table-panel">
      <div className="panel-head">
        <h2>Реестр заявок</h2>
      </div>
      <div className="report-list">
        {rows.map((row) => (
          <div key={row.id}>
            <span>
              #{row.id} · {row.organization?.legalName ?? "Без организации"} ·{" "}
              {row.store?.name ?? "Без точки"}
              <small>
                {" "}
                {row.department.name} ·{" "}
                {row.assignees.join(", ") || "не назначена"} ·{" "}
                {formatDate(row.createdAt)}
              </small>
            </span>
            <b>{statuses[row.status]}</b>
          </div>
        ))}
      </div>
    </section>
  );
}

export function ProcurementReport({
  rows,
  formatDate,
}: {
  rows: ProcurementRow[];
  formatDate: (value?: string | null) => string;
}) {
  return (
    <section className="panel table-panel">
      <div className="panel-head">
        <div>
          <h2>Планируемые закупки</h2>
          <p>Активные плановые заявки по дате работ в выбранном периоде.</p>
        </div>
      </div>
      {rows.length ? (
        <div className="procurement-list">
          {rows.map((row) => (
            <article key={row.componentId}>
              <div>
                <h3>{row.name}</h3>
                <p>{row.requests} заявок</p>
              </div>
              <strong>{row.quantity} шт.</strong>
              <details>
                <summary>Состав потребности</summary>
                {row.schedule.map((item) => (
                  <p key={`${item.requestId}-${item.quantity}`}>
                    #{item.requestId} · {formatDate(item.scheduledAt)} ·{" "}
                    {item.organization ?? "Без организации"}
                    {item.store ? ` / ${item.store}` : ""} — {item.quantity} шт.
                  </p>
                ))}
              </details>
            </article>
          ))}
        </div>
      ) : (
        <p className="report-empty">
          На выбранный период активных плановых заявок с компонентами нет.
        </p>
      )}
    </section>
  );
}

export const statuses: Record<RequestStatus, string> = {
  NEW: "Новая",
  ACCEPTED: "Принята",
  IN_PROGRESS: "В работе",
  DONE: "Выполнена",
  CANCELLED: "Отменена",
};
export const sourceLabel: Record<string, string> = {
  WEB: "CRM / сайт",
  TELEGRAM_BOT: "Telegram-бот",
  TELEGRAM_ACCOUNT: "Telegram-аккаунт",
};
