import { Search } from "lucide-react";
import { Button } from "../../../components/ui";
import { priorityLabel, statusLabel } from "../requestDisplay";
import type {
  Department,
  Priority,
  RequestStatus,
  RequestType,
  User,
} from "../../../types";

export type RequestSchedule = "ALL" | "TODAY" | "WEEK" | "OVERDUE";

export function RequestFilters({
  search,
  status,
  priority,
  departmentId,
  typeId,
  assigneeId,
  schedule,
  myToday,
  showClosed,
  departments,
  types,
  assignees,
  setSearch,
  setStatus,
  setPriority,
  setDepartmentId,
  setTypeId,
  setAssigneeId,
  setSchedule,
  setMyToday,
  setShowClosed,
  clear,
}: {
  search: string;
  status: RequestStatus | "";
  priority: Priority | "";
  departmentId: string;
  typeId: string;
  assigneeId: string;
  schedule: RequestSchedule;
  myToday: boolean;
  showClosed: boolean;
  departments: Department[];
  types: RequestType[];
  assignees: Pick<User, "id" | "ipName">[];
  setSearch: (value: string) => void;
  setStatus: (value: RequestStatus | "") => void;
  setPriority: (value: Priority | "") => void;
  setDepartmentId: (value: string) => void;
  setTypeId: (value: string) => void;
  setAssigneeId: (value: string) => void;
  setSchedule: (value: RequestSchedule) => void;
  setMyToday: (value: boolean) => void;
  setShowClosed: (value: boolean) => void;
  clear: () => void;
}) {
  return (
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
        onChange={(event) => setSchedule(event.target.value as RequestSchedule)}
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
  );
}
