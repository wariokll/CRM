import { useState } from "react";
import { Plus } from "lucide-react";
import { Button } from "../../../components/ui";
import type { ServiceRequest } from "../../../types";

export function CalendarPage({
  requests,
  open,
  add,
}: {
  requests: ServiceRequest[];
  open: (item: ServiceRequest) => void;
  add: (date: Date) => void;
}) {
  const [cursor, setCursor] = useState(() => new Date());
  const monthStart = new Date(cursor.getFullYear(), cursor.getMonth(), 1);
  const firstWeekday = (monthStart.getDay() + 6) % 7;
  const days = Array.from(
    { length: 42 },
    (_, index) =>
      new Date(
        cursor.getFullYear(),
        cursor.getMonth(),
        index - firstWeekday + 1,
      ),
  );
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const monthTitle = new Intl.DateTimeFormat("ru-RU", {
    month: "long",
    year: "numeric",
  }).format(cursor);
  const scheduleFor = (day: Date) => {
    const value = new Date(day);
    value.setHours(10, 0, 0, 0);
    const minimum = new Date(Date.now() + 600000);
    return value < minimum ? minimum : value;
  };
  const sameDay = (left: Date, right: Date) =>
    left.getFullYear() === right.getFullYear() &&
    left.getMonth() === right.getMonth() &&
    left.getDate() === right.getDate();
  const time = (value: string) =>
    new Intl.DateTimeFormat("ru-RU", {
      hour: "2-digit",
      minute: "2-digit",
    }).format(new Date(value));
  return (
    <section className="panel calendar-page">
      <div className="calendar-toolbar">
        <div>
          <button
            aria-label="Предыдущий месяц"
            onClick={() =>
              setCursor(
                new Date(cursor.getFullYear(), cursor.getMonth() - 1, 1),
              )
            }
          >
            ‹
          </button>
          <h2>{monthTitle}</h2>
          <button
            aria-label="Следующий месяц"
            onClick={() =>
              setCursor(
                new Date(cursor.getFullYear(), cursor.getMonth() + 1, 1),
              )
            }
          >
            ›
          </button>
        </div>
        <Button onClick={() => add(scheduleFor(new Date()))}>
          <Plus /> Новая плановая
        </Button>
      </div>
      <div className="calendar-weekdays">
        {["Пн", "Вт", "Ср", "Чт", "Пт", "Сб", "Вс"].map((day) => (
          <span key={day}>{day}</span>
        ))}
      </div>
      <div className="calendar-grid">
        {days.map((day) => {
          const past = day < today;
          const items = requests.filter(
            (item) =>
              item.urgency === "SCHEDULED" &&
              item.scheduledAt &&
              new Date(item.scheduledAt) >= new Date() &&
              !["DONE", "CANCELLED"].includes(item.status) &&
              sameDay(new Date(item.scheduledAt), day),
          );
          return (
            <div
              key={day.toISOString()}
              className={`calendar-cell ${day.getMonth() !== cursor.getMonth() ? "muted-day" : ""} ${sameDay(day, today) ? "today" : ""} ${past ? "" : "clickable"}`}
              onClick={() => !past && add(scheduleFor(day))}
            >
              <span>{day.getDate()}</span>
              {items.map((item) => (
                <button
                  key={item.id}
                  title={`Открыть заявку #${item.id}`}
                  style={{ borderColor: item.type.color || "#ee7865" }}
                  onClick={(event) => {
                    event.stopPropagation();
                    open(item);
                  }}
                >
                  <b>
                    {time(item.scheduledAt!)} · {item.type.name}
                  </b>
                  <small>
                    {item.store?.name ??
                      item.organization?.legalName ??
                      item.description}
                  </small>
                </button>
              ))}
            </div>
          );
        })}
      </div>
      <p className="calendar-hint">
        В календаре показываются только будущие активные плановые заявки.
      </p>
    </section>
  );
}
