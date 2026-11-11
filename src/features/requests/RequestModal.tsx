import { useEffect, useState } from "react";
import { Trash2 } from "lucide-react";
import { ApiError } from "../../api";
import { can, roleLabel } from "../../auth/permissions";
import { Button, Field, Modal } from "../../components/ui";
import { RequestSummary } from "./RequestSummary";
import { RequestHistory } from "./RequestHistory";
import { priorityLabel, statusLabel, transitions } from "./requestDisplay";
import type {
  Department,
  Priority,
  RequestStatus,
  ServiceRequest,
  StaffMember,
  User,
} from "../../types";
import {
  addRequestComment,
  deleteRequest,
  getRequestAssignees,
  takeRequest,
  updateRequest,
} from "./queries";

function errorText(reason: unknown) {
  return reason instanceof ApiError || reason instanceof Error
    ? reason.message
    : "Request failed";
}

export function RequestModal({
  item,
  user,
  departments,
  close,
  reload,
}: {
  item: ServiceRequest;
  user: User;
  departments: Department[];
  close: () => void;
  reload: () => void;
}) {
  const [status, setStatus] = useState(item.status),
    [priority, setPriority] = useState(item.priority),
    [departmentId, setDepartmentId] = useState(item.departmentId),
    [comment, setComment] = useState(""),
    [internal, setInternal] = useState(false),
    [assignees, setAssignees] = useState<StaffMember[]>([]),
    [selected, setSelected] = useState(item.assignees.map((a) => a.user.id)),
    [error, setError] = useState(""),
    [deleting, setDeleting] = useState(false);
  const staff = user.role !== "CLIENT";
  const canManage = staff && can(user, "MANAGE_REQUESTS");
  useEffect(() => {
    if (staff && can(user, "ASSIGN_MASTERS"))
      getRequestAssignees(departmentId)
        .then(setAssignees)
        .catch(() => setAssignees([]));
  }, [departmentId, staff, user]);
  const save = async (nextStatus = status) => {
    try {
      await updateRequest(item.id, {
        status: nextStatus,
        ...(can(user, "SET_PRIORITY") && { priority }),
        ...(can(user, "TRANSFER_REQUESTS") && { departmentId }),
        ...(can(user, "ASSIGN_MASTERS") && { assigneeIds: selected }),
      });
      reload();
      close();
    } catch (reason) {
      setError(errorText(reason));
    }
  };
  const addComment = async () => {
    if (!comment.trim()) return;
    try {
      await addRequestComment(item.id, {
        body: comment,
        visibility: internal ? "INTERNAL" : "CLIENT",
      });
      setComment("");
      reload();
    } catch (reason) {
      setError(errorText(reason));
    }
  };
  const take = async () => {
    try {
      await takeRequest(item.id);
      reload();
    } catch (reason) {
      setError(errorText(reason));
    }
  };
  const finish = async () => save("DONE");
  const remove = async () => {
    if (
      !window.confirm(
        `Удалить заявку #${item.id} без возможности восстановления?`,
      )
    )
      return;
    try {
      setError("");
      setDeleting(true);
      await deleteRequest(item.id);
      reload();
      close();
    } catch (reason) {
      setError(errorText(reason));
    } finally {
      setDeleting(false);
    }
  };
  return (
    <Modal title={`Заявка #${item.id}`} close={close} wide>
      <RequestSummary item={item} />
      <RequestHistory item={item} />
      {staff && (
        <>
          <div className="form-grid">
            <Field label="Статус">
              <select
                disabled={!canManage}
                value={status}
                onChange={(e) => setStatus(e.target.value as RequestStatus)}
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
                  onChange={(e) => setPriority(e.target.value as Priority)}
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
                  onChange={(e) => setDepartmentId(Number(e.target.value))}
                >
                  {departments
                    .filter((d) => d.isActive)
                    .map((d) => (
                      <option value={d.id} key={d.id}>
                        {d.name}
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
                onChange={(e) =>
                  setSelected(
                    Array.from(e.currentTarget.selectedOptions, (option) =>
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
                onChange={(e) => setComment(e.target.value)}
                placeholder="Напишите клиенту или оставьте внутреннюю заметку"
              />
            </Field>
            <Field label="Видимость">
              <select
                value={internal ? "INTERNAL" : "CLIENT"}
                onChange={(e) => setInternal(e.target.value === "INTERNAL")}
              >
                <option value="CLIENT">Виден клиенту</option>
                <option value="INTERNAL">Только сотрудникам</option>
              </select>
            </Field>
          </div>
          {error && <div className="form-error">{error}</div>}
          <div className="modal-actions">
            {can(user, "DELETE_REQUESTS") && (
              <Button
                kind="danger"
                onClick={() => void remove()}
                disabled={deleting}
              >
                <Trash2 /> {deleting ? "Удаление…" : "Удалить заявку"}
              </Button>
            )}
            {user.role === "MASTER" &&
              !item.assignees.some((a) => a.user.id === user.id) && (
                <Button kind="secondary" onClick={take}>
                  Взять в работу
                </Button>
              )}
            <Button kind="secondary" onClick={addComment}>
              Добавить комментарий
            </Button>
            {canManage &&
              item.status !== "DONE" &&
              item.status !== "CANCELLED" && (
                <Button kind="secondary" onClick={finish}>
                  Завершить заявку
                </Button>
              )}
            {canManage && (
              <Button onClick={() => void save()}>Сохранить изменения</Button>
            )}
          </div>
        </>
      )}
    </Modal>
  );
}
