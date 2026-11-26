import { Trash2 } from "lucide-react";
import { can, roleLabel } from "../../auth/permissions";
import { Button, Field } from "../../components/ui";
import { priorityLabel, statusLabel, transitions } from "./requestDisplay";
import type {
  Department,
  Priority,
  RequestStatus,
  ServiceRequest,
  StaffMember,
  User,
} from "../../types";

export function RequestStaffControls({
  item,
  user,
  canManage,
  status,
  setStatus,
  priority,
  setPriority,
  departmentId,
  setDepartmentId,
  departments,
  assignees,
  selected,
  setSelected,
  comment,
  setComment,
  internal,
  setInternal,
  error,
  deleting,
  remove,
  take,
  addComment,
  finish,
  save,
}: {
  item: ServiceRequest;
  user: User;
  canManage: boolean;
  status: RequestStatus;
  setStatus: (value: RequestStatus) => void;
  priority: Priority;
  setPriority: (value: Priority) => void;
  departmentId: number;
  setDepartmentId: (value: number) => void;
  departments: Department[];
  assignees: StaffMember[];
  selected: number[];
  setSelected: (value: number[]) => void;
  comment: string;
  setComment: (value: string) => void;
  internal: boolean;
  setInternal: (value: boolean) => void;
  error: string;
  deleting: boolean;
  remove: () => void;
  take: () => void;
  addComment: () => void;
  finish: () => void;
  save: () => void;
}) {
  return (
    <>
      <div className="form-grid">
        <Field label="Статус">
          <select
            disabled={!canManage}
            value={status}
            onChange={(event) => setStatus(event.target.value as RequestStatus)}
          >
            {[item.status, ...transitions[item.status]].map((value) => (
              <option key={value} value={value}>
                {statusLabel[value]}
              </option>
            ))}
          </select>
        </Field>
        {can(user, "SET_PRIORITY") && (
          <Field label="Приоритет">
            <select
              value={priority}
              onChange={(event) => setPriority(event.target.value as Priority)}
            >
              {Object.entries(priorityLabel).map(([value, label]) => (
                <option key={value} value={value}>
                  {label}
                </option>
              ))}
            </select>
          </Field>
        )}
        {can(user, "TRANSFER_REQUESTS") && (
          <Field label="Передать в отдел">
            <select
              value={departmentId}
              onChange={(event) => setDepartmentId(Number(event.target.value))}
            >
              {departments
                .filter((department) => department.isActive)
                .map((department) => (
                  <option value={department.id} key={department.id}>
                    {department.name}
                  </option>
                ))}
            </select>
          </Field>
        )}
      </div>
      {can(user, "ASSIGN_MASTERS") && (
        <Field label="Исполнители (можно выбрать нескольких)">
          <select
            multiple
            value={selected.map(String)}
            onChange={(event) =>
              setSelected(
                Array.from(event.currentTarget.selectedOptions, (option) =>
                  Number(option.value),
                ),
              )
            }
          >
            {assignees.map((person) => (
              <option value={person.id} key={person.id}>
                {person.ipName} · {roleLabel[person.role]}
              </option>
            ))}
          </select>
        </Field>
      )}
      <div className="form-grid">
        <Field label="Комментарий">
          <textarea
            rows={3}
            value={comment}
            onChange={(event) => setComment(event.target.value)}
            placeholder="Напишите клиенту или оставьте внутреннюю заметку"
          />
        </Field>
        <Field label="Видимость">
          <select
            value={internal ? "INTERNAL" : "CLIENT"}
            onChange={(event) => setInternal(event.target.value === "INTERNAL")}
          >
            <option value="CLIENT">Виден клиенту</option>
            <option value="INTERNAL">Только сотрудникам</option>
          </select>
        </Field>
      </div>
      {error && <div className="form-error">{error}</div>}
      <div className="modal-actions">
        {can(user, "DELETE_REQUESTS") && (
          <Button kind="danger" onClick={remove} disabled={deleting}>
            <Trash2 /> {deleting ? "Удаление…" : "Удалить заявку"}
          </Button>
        )}
        {user.role === "MASTER" &&
          !item.assignees.some((assignee) => assignee.user.id === user.id) && (
            <Button kind="secondary" onClick={take}>
              Взять в работу
            </Button>
          )}
        <Button kind="secondary" onClick={addComment}>
          Добавить комментарий
        </Button>
        {canManage && item.status !== "DONE" && item.status !== "CANCELLED" && (
          <Button kind="secondary" onClick={finish}>
            Завершить заявку
          </Button>
        )}
        {canManage && <Button onClick={save}>Сохранить изменения</Button>}
      </div>
    </>
  );
}
