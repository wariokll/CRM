import { useMemo } from "react";
import { useSearchParams } from "react-router-dom";
import { Empty } from "../../../components/ui";
import { RequestCard } from "./RequestCard";
import { RequestFilters, type RequestSchedule } from "./RequestFilters";
import type {
  Department,
  Priority,
  RequestStatus,
  RequestType,
  ServiceRequest,
  User,
} from "../../../types";

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
  const schedule = (params.get("schedule") ?? "ALL") as RequestSchedule;
  const myToday = params.get("myToday") === "1";
  const setShowClosed = (value: boolean) =>
    updateParam("closed", value ? "1" : "");
  const setSearch = (value: string) => updateParam("search", value);
  const setStatus = (value: RequestStatus | "") => updateParam("status", value);
  const setPriority = (value: Priority | "") => updateParam("priority", value);
  const setDepartmentId = (value: string) => updateParam("departmentId", value);
  const setTypeId = (value: string) => updateParam("typeId", value);
  const setAssigneeId = (value: string) => updateParam("assigneeId", value);
  const setSchedule = (value: RequestSchedule) =>
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
      <RequestFilters
        search={search}
        status={status}
        priority={priority}
        departmentId={departmentId}
        typeId={typeId}
        assigneeId={assigneeId}
        schedule={schedule}
        myToday={myToday}
        showClosed={showClosed}
        departments={departments}
        types={types}
        assignees={assignees}
        setSearch={setSearch}
        setStatus={setStatus}
        setPriority={setPriority}
        setDepartmentId={setDepartmentId}
        setTypeId={setTypeId}
        setAssigneeId={setAssigneeId}
        setSchedule={setSchedule}
        setMyToday={setMyToday}
        setShowClosed={setShowClosed}
        clear={clear}
      />
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
