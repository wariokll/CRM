import { Plus } from "lucide-react";
import { Button } from "../../components/ui";
import type { Organization } from "../../types";

export function StoresToolbar({
  organizations,
  selectedOrganizationId,
  visibleCount,
  selectOrganization,
  clearFilter,
  addStore,
}: {
  organizations: Organization[];
  selectedOrganizationId: number | null;
  visibleCount: number;
  selectOrganization: (id: number | null) => void;
  clearFilter: () => void;
  addStore: () => void;
}) {
  return (
    <div className="section-actions">
      <span>
        {visibleCount} торговых точек
        {selectedOrganizationId &&
          " · " +
            (organizations.find((item) => item.id === selectedOrganizationId)
              ?.legalName ?? "")}
      </span>
      <div className="inline-actions">
        <select
          className="store-organization-filter"
          value={selectedOrganizationId ?? ""}
          aria-label="Фильтр по организации"
          onChange={(event) =>
            selectOrganization(Number(event.target.value) || null)
          }
        >
          <option value="">Все организации</option>
          {organizations.map((organization) => (
            <option value={organization.id} key={organization.id}>
              {organization.legalName}
            </option>
          ))}
        </select>
        {selectedOrganizationId && (
          <Button kind="secondary" onClick={clearFilter}>
            Все организации
          </Button>
        )}
        <Button onClick={addStore}>
          <Plus /> Добавить точку
        </Button>
      </div>
    </div>
  );
}
