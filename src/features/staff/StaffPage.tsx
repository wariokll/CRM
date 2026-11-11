import { useState, type FormEvent } from "react";
import { Plus, UserRoundCog } from "lucide-react";
import { ApiError } from "../../api";
import { Button } from "../../components/ui";
import { permissionLabels, roleLabel } from "../../auth/permissions";
import type { Department, PermissionKey, StaffMember } from "../../types";
import { StaffAccessDialog } from "./StaffAccessDialog";
import { staffRequest } from "./queries";

function errorText(reason: unknown) {
  return reason instanceof ApiError || reason instanceof Error
    ? reason.message
    : "Request failed";
}

export function StaffPage({
  staff,
  departments,
  reload,
}: {
  staff: StaffMember[];
  departments: Department[];
  reload: () => void;
}) {
  const [editing, setEditing] = useState<StaffMember | "new" | null>(null),
    [error, setError] = useState(""),
    [telegramLink, setTelegramLink] = useState<{
      deepLink: string;
      expiresAt: string;
    } | null>(null);
  const submit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setError("");
    const form = new FormData(event.currentTarget);
    const role = String(form.get("role")) as StaffMember["role"];
    const ids = form.getAll("departments").map(Number);
    const permissions = (Object.keys(permissionLabels) as PermissionKey[]).map(
      (permission) => ({
        permission,
        enabled: form.get(`permission-${permission}`) === "on",
      }),
    );
    try {
      if (editing === "new")
        await staffRequest("/staff", {
          method: "POST",
          body: JSON.stringify({
            name: form.get("name"),
            email: form.get("email"),
            phone: form.get("phone"),
            password: form.get("password"),
            role,
            departmentIds: ids,
          }),
        });
      else
        await staffRequest(`/staff/${editing!.id}/access`, {
          method: "PUT",
          body: JSON.stringify({
            role,
            departments: ids.map((departmentId) => ({
              departmentId,
              membershipRole: role === "DEPARTMENT_HEAD" ? "HEAD" : "MASTER",
            })),
            permissions,
          }),
        });
      setEditing(null);
      reload();
    } catch (reason) {
      setError(errorText(reason));
    }
  };
  const createTelegramLink = async (id: number) => {
    try {
      setError("");
      setTelegramLink(
        await staffRequest<{ deepLink: string; expiresAt: string }>(
          `/staff/${id}/telegram-link`,
          { method: "POST" },
        ),
      );
    } catch (reason) {
      setError(errorText(reason));
    }
  };
  return (
    <>
      <div className="section-actions">
        <span>{staff.length} сотрудников</span>
        <Button onClick={() => setEditing("new")}>
          <Plus /> Добавить сотрудника
        </Button>
      </div>
      <section className="panel data-table">
        <div className="table-row table-head">
          <span>Сотрудник</span>
          <span>Роль</span>
          <span>Отделы</span>
          <span>Статус</span>
          <span />
        </div>
        {staff.map((person) => (
          <div className="table-row" key={person.id}>
            <span>
              <b>{person.ipName}</b>
              <small>
                {person.email} · {person.phone}
              </small>
            </span>
            <span>{roleLabel[person.role]}</span>
            <span>
              {person.departmentMemberships
                .map((d) => d.department.name)
                .join(", ") || "—"}
            </span>
            <span>
              {person.status === "ACTIVE" ? "Активен" : "Заблокирован"}
            </span>
            <span>
              <Button kind="ghost" onClick={() => setEditing(person)}>
                <UserRoundCog />
              </Button>
            </span>
          </div>
        ))}
      </section>
      <StaffAccessDialog
        editing={editing}
        setEditing={setEditing}
        departments={departments}
        submit={submit}
        error={error}
        createTelegramLink={createTelegramLink}
        telegramLink={telegramLink}
      />
    </>
  );
}
