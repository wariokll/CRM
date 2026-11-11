import { useMemo } from "react";
import { useSearchParams } from "react-router-dom";
import { Search } from "lucide-react";
import { Button, Empty } from "../../components/ui";
import { RequestCard } from "./RequestCard";
import { priorityLabel, statusLabel } from "./requestDisplay";
import type {
  Department,
  Priority,
  RequestStatus,
  RequestType,
  ServiceRequest,
  User,
} from "../../types";

export function RequestsList({
  requests,
  user,
  departments,
  types,
  open,
}: {
  requests: ServiceRequest[];
  user: User;
  departments: Department[];
  types: RequestType[];
  open: (item: ServiceRequest) => void;
}) {
  const [params, setParams] = useSearchParams();
  const updateParam = (key: string, value: string) => {
    setParams(
      (current) => {
        const next = new URLSearchParams(current);
        if (value) next.set(key, value);
        else next.delete(key);
        return next;
      },
      { replace: true },
    );
  };
  const showClosed = params.get("closed") === "1";
  const search = params.get("search") ?? "";
  const status = (params.get("status") ?? "") as RequestStatus | "";
  const priority = (params.get("priority") ?? "") as Priority | "";
  const departmentId = params.get("departmentId") ?? "";
  const typeId = params.get("typeId") ?? "";
  const assigneeId = params.get("assigneeId") ?? "";
  const schedule = (params.get("schedule") ?? "ALL") as
    "ALL" | "TODAY" | "WEEK" | "OVERDUE";
  const myToday = params.get("myToday") === "1";
  const setShowClosed = (value: boolean) =>
    updateParam("closed", value ? "1" : "");
  const setSearch = (value: string) => updateParam("search", value);
  const setStatus = (value: RequestStatus | "") => updateParam("status", value);
  const setPriority = (value: Priority | "") => updateParam("priority", value);
  const setDepartmentId = (value: string) => updateParam("departmentId", value);
  const setTypeId = (value: string) => updateParam("typeId", value);
  const setAssigneeId = (value: string) => updateParam("assigneeId", value);
  const setSchedule = (value: "ALL" | "TODAY" | "WEEK" | "OVERDUE") =>
    updateParam("schedule", value === "ALL" ? "" : value);
  const setMyToday = (value: boolean) =>
    updateParam("myToday", value ? "1" : "");
  const assignees = useMemo(
    () =>
      Array.from(
        new Map(
          requests.flatMap((item) =>
            item.assignees.map(
              (assignee) => [assignee.user.id, assignee.user] as const,
            ),
          ),
        ).values(),
      ).sort((left, right) => left.ipName.localeCompare(right.ipName, "ru")),
    [requests],
  );
  const rows = useMemo(() => {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const weekEnd = new Date(today);
    weekEnd.setDate(today.getDate() + 7);
    const matchesSchedule = (value?: string | null) => {
      if (schedule === "ALL") return true;
      if (!value) return false;
      const date = new Date(value);
      date.setHours(0, 0, 0, 0);
      if (schedule === "TODAY") return date.getTime() === today.getTime();
      if (schedule === "OVERDUE") return new Date(value) < new Date();
      return date >= today && date < weekEnd;
    };
    return requests.filter((item) => {
      const haystack =
        `${item.description} ${item.organization?.legalName ?? ""} ${item.store?.name ?? ""} ${item.type.name}`.toLowerCase();
      const assignedToMe = item.assignees.some(
        (assignee) => assignee.user.id === user.id,
      );
      const scheduledForToday =
        item.urgency === "SCHEDULED" &&
        item.scheduledAt &&
        new Date(item.scheduledAt).toDateString() === today.toDateString();
      return (
        (showClosed
          ? item.status === "DONE"
          : !["DONE", "CANCELLED"].includes(item.status)) &&
        (!search || haystack.includes(search.toLowerCase())) &&
        (!status || item.status === status) &&
        (!priority || item.priority === priority) &&
        (!departmentId || item.departmentId === Number(departmentId)) &&
        (!typeId || item.typeId === Number(typeId)) &&
        (!assigneeId ||
          item.assignees.some(
            (assignee) => assignee.user.id === Number(assigneeId),
          )) &&
        matchesSchedule(item.scheduledAt) &&
        (!myToday ||
          (assignedToMe && (item.urgency === "URGENT" || scheduledForToday)))
      );
    });
  }, [
    requests,
    showClosed,
    search,
    status,
    priority,
    departmentId,
    typeId,
    assigneeId,
    schedule,
    myToday,
    user.id,
  ]);
  const clear = () => {
    setParams(
      (current) => {
        const next = new URLSearchParams(current);
        [
          "search",
          "status",
          "priority",
          "departmentId",
          "typeId",
          "assigneeId",
          "schedule",
          "myToday",
        ].forEach((key) => next.delete(key));
        return next;
      },
      { replace: true },
    );
  };
  return (
    <section className="panel table-panel">
      <div className="toolbar request-filters">
        <div className="search-box">
          <Search />
          <input
            value={search}
            placeholder="Поиск по заявкам"
            onChange={(event) => setSearch(event.target.value)}
          />
        </div>
        <select
          value={status}
          onChange={(event) =>
            setStatus(event.target.value as RequestStatus | "")
          }
        >
          <option value="">Все активные статусы</option>
          {Object.entries(statusLabel)
            .filter(([value]) => value !== "DONE" && value !== "CANCELLED")
            .map(([value, label]) => (
              <option key={value} value={value}>
                {label}
              </option>
            ))}
        </select>
        <select
          value={priority}
          onChange={(event) => setPriority(event.target.value as Priority | "")}
        >
          <option value="">Все приоритеты</option>
          {Object.entries(priorityLabel).map(([value, label]) => (
            <option key={value} value={value}>
              {label}
            </option>
          ))}
        </select>
        <select
          value={departmentId}
          onChange={(event) => setDepartmentId(event.target.value)}
        >
          <option value="">Все отделы</option>
          {departments.map((item) => (
            <option key={item.id} value={item.id}>
              {item.name}
            </option>
          ))}
        </select>
        <select
          value={typeId}
          onChange={(event) => setTypeId(event.target.value)}
        >
          <option value="">Все шаблоны</option>
          {types.map((item) => (
            <option key={item.id} value={item.id}>
              {item.name}
            </option>
          ))}
        </select>
        <select
          value={assigneeId}
          onChange={(event) => setAssigneeId(event.target.value)}
        >
          <option value="">Все исполнители</option>
          {assignees.map((item) => (
            <option key={item.id} value={item.id}>
              {item.ipName}
            </option>
          ))}
        </select>
        <select
          value={schedule}
          onChange={(event) =>
            setSchedule(
              event.target.value as "ALL" | "TODAY" | "WEEK" | "OVERDUE",
            )
          }
        >
          <option value="ALL">Любая дата</option>
          <option value="TODAY">Запланировано сегодня</option>
          <option value="WEEK">Запланировано на 7 дней</option>
          <option value="OVERDUE">Просроченные</option>
        </select>
        <Button
          kind={myToday ? "primary" : "secondary"}
          onClick={() => setMyToday(!myToday)}
        >
          Мои на сегодня
        </Button>
        <Button kind="ghost" onClick={clear}>
          Сбросить
        </Button>
        <Button kind="secondary" onClick={() => setShowClosed(!showClosed)}>
          {showClosed ? "Показать активные" : "Показать выполненные"}
        </Button>
      </div>
      <div className="request-filter-summary">Найдено: {rows.length}</div>
      <div className="request-grid">
        {rows.map((item) => (
          <RequestCard item={item} open={() => open(item)} key={item.id} />
        ))}
        {!rows.length && (
          <Empty
            title="Заявок не найдено"
            text="Измените условия фильтра или сбросьте их."
          />
        )}
      </div>
    </section>
  );
}
