import { useEffect, useState } from "react";
import { ApiError } from "../../../api";
import { can } from "../../../auth/permissions";
import { Modal } from "../../../components/ui";
import { RequestSummary } from "./RequestSummary";
import { RequestHistory } from "./RequestHistory";
import { RequestStaffControls } from "./RequestStaffControls";
import type {
  Department,
  ServiceRequest,
  StaffMember,
  User,
} from "../../../types";
import { getRequestAssignees, useRequestMutation } from "../queries";

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
  const requestMutation = useRequestMutation();
  const canManage = staff && can(user, "MANAGE_REQUESTS");
  useEffect(() => {
    if (staff && can(user, "ASSIGN_MASTERS"))
      getRequestAssignees(departmentId)
        .then(setAssignees)
        .catch(() => setAssignees([]));
  }, [departmentId, staff, user]);
  const save = async (nextStatus = status) => {
    try {
      await requestMutation.mutateAsync({
        path: `/requests/${item.id}`,
        init: {
          method: "PATCH",
          body: JSON.stringify({
            status: nextStatus,
            ...(can(user, "SET_PRIORITY") && { priority }),
            ...(can(user, "TRANSFER_REQUESTS") && { departmentId }),
            ...(can(user, "ASSIGN_MASTERS") && { assigneeIds: selected }),
          }),
        },
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
      await requestMutation.mutateAsync({
        path: `/requests/${item.id}/comments`,
        init: {
          method: "POST",
          body: JSON.stringify({
            body: comment,
            visibility: internal ? "INTERNAL" : "CLIENT",
          }),
        },
      });
      setComment("");
      reload();
    } catch (reason) {
      setError(errorText(reason));
    }
  };
  const take = async () => {
    try {
      await requestMutation.mutateAsync({
        path: `/requests/${item.id}/assignees/self`,
        init: { method: "POST" },
      });
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
      await requestMutation.mutateAsync({
        path: `/requests/${item.id}`,
        init: { method: "DELETE" },
      });
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
          <RequestStaffControls
            item={item}
            user={user}
            canManage={canManage}
            status={status}
            setStatus={setStatus}
            priority={priority}
            setPriority={setPriority}
            departmentId={departmentId}
            setDepartmentId={setDepartmentId}
            departments={departments}
            assignees={assignees}
            selected={selected}
            setSelected={setSelected}
            comment={comment}
            setComment={setComment}
            internal={internal}
            setInternal={setInternal}
            error={error}
            deleting={deleting}
            remove={() => void remove()}
            take={() => void take()}
            addComment={() => void addComment()}
            finish={() => void finish()}
            save={() => void save()}
          />
        </>
      )}
    </Modal>
  );
}
