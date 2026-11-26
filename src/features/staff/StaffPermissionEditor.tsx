import {
  defaultPermissions,
  permissionGroups,
  permissionLabels,
} from "../../auth/permissions";
import type { PermissionKey, StaffMember } from "../../types";

export function StaffPermissionEditor({
  editing,
}: {
  editing: StaffMember | "new";
}) {
  const enabled = (key: PermissionKey) => {
    if (editing === "new") return false;
    return (
      editing.permissionOverrides.find((item) => item.permission === key)
        ?.enabled ?? defaultPermissions[editing.role].includes(key)
    );
  };
  const role = editing === "new" ? "MASTER" : editing.role;
  return (
    <section className="access-groups">
      <div className="access-group-head">
        <div>
          <h3>Индивидуальные разрешения</h3>
          <p>Переключатели дополняют или ограничивают права выбранной роли.</p>
        </div>
      </div>
      {permissionGroups.map((group) => (
        <section className="access-group" key={group.title}>
          <div className="access-group-head">
            <div>
              <h4>{group.title}</h4>
              <p>{group.description}</p>
            </div>
          </div>
          <div className="access-list">
            {group.permissions.map((key) => (
              <label className="access-row" key={key}>
                <input
                  name={`permission-${key}`}
                  type="checkbox"
                  defaultChecked={enabled(key)}
                />
                <span>
                  <b>{permissionLabels[key]}</b>
                  <small>
                    {defaultPermissions[role].includes(key)
                      ? "Входит в права роли"
                      : "Дополнительное разрешение"}
                  </small>
                </span>
              </label>
            ))}
          </div>
        </section>
      ))}
    </section>
  );
}
