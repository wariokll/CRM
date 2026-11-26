import { useState, type FormEvent } from "react";
import { useSearchParams } from "react-router-dom";
import { Plus } from "lucide-react";
import { ApiError } from "../../api";
import { Button, Empty } from "../../components/ui";
import { StoreGroups } from "./StoreGroups";
import { StoreDetails } from "./StoreDetails";
import { StoreCreateDialog } from "./StoreCreateDialog";
import {
  getStoreAccess,
  useSaveStoreAccessMutation,
  useStoreMutation,
} from "./queries";
import type { Organization, Store, User } from "../../types";

function errorText(reason: unknown) {
  return reason instanceof ApiError || reason instanceof Error
    ? reason.message
    : "Request failed";
}

export function StoresPage({
  stores,
  organizations,
  user,
  reload,
  organizationFilter,
  setOrganizationFilter,
}: {
  stores: Store[];
  organizations: Organization[];
  user: User;
  reload: () => void;
  organizationFilter: number | null;
  setOrganizationFilter: (id: number | null) => void;
}) {
  const [searchParams, setSearchParams] = useSearchParams();
  const [adding, setAdding] = useState(false),
    [error, setError] = useState(""),
    [deletingId, setDeletingId] = useState<number | null>(null);
  const storeMutation = useStoreMutation();
  const saveAccessMutation = useSaveStoreAccessMutation();
  const selectedId = Number(searchParams.get("storeId")) || null;
  const selected = stores.find((store) => store.id === selectedId) ?? null;
  const setSelected = (store: Store | null) => {
    setSearchParams(
      (current) => {
        const next = new URLSearchParams(current);
        if (store) next.set("storeId", String(store.id));
        else next.delete("storeId");
        return next;
      },
      { replace: store === null },
    );
  };
  const selectedOrganizationId = organizationFilter;
  const visibleOrganizations = selectedOrganizationId
    ? organizations.filter(
        (organization) => organization.id === selectedOrganizationId,
      )
    : organizations;
  const groups = visibleOrganizations
    .map((organization) => ({
      organization,
      stores: stores
        .filter((store) => store.organizationId === organization.id)
        .sort(
          (left, right) =>
            Number(right.status === "PENDING") -
            Number(left.status === "PENDING"),
        ),
    }))
    .filter((group) => group.stores.length || Boolean(selectedOrganizationId))
    .sort(
      (left, right) =>
        Number(
          right.organization.status === "PENDING" ||
            right.stores.some((store) => store.status === "PENDING"),
        ) -
        Number(
          left.organization.status === "PENDING" ||
            left.stores.some((store) => store.status === "PENDING"),
        ),
    );
  const visibleCount = groups.reduce(
    (total, group) => total + group.stores.length,
    0,
  );
  const submit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const values = Object.fromEntries(new FormData(event.currentTarget));
    await storeMutation.mutateAsync({
      path: "/stores",
      init: {
        method: "POST",
        body: JSON.stringify({
          ...values,
          organizationId: Number(values.organizationId),
        }),
      },
    });
    setAdding(false);
    reload();
  };
  const approve = async (id: number) => {
    try {
      setError("");
      await storeMutation.mutateAsync({
        path: "/stores/" + id + "/approve",
        init: { method: "POST" },
      });
      reload();
    } catch (reason) {
      setError(errorText(reason));
    }
  };
  const reject = async (id: number) => {
    const rejectionReason = window.prompt(
      "Укажите причину отказа (её увидит клиент):",
    );
    if (!rejectionReason?.trim()) return;
    try {
      setError("");
      await storeMutation.mutateAsync({
        path: "/stores/" + id + "/reject",
        init: { method: "POST", body: JSON.stringify({ rejectionReason }) },
      });
      reload();
    } catch (reason) {
      setError(errorText(reason));
    }
  };
  const remove = async (store: Store) => {
    if (
      !window.confirm(
        `Удалить точку «${store.name}»? Связанные заявки сохранятся без связи с этой точкой.`,
      )
    )
      return;
    try {
      setError("");
      setDeletingId(store.id);
      await storeMutation.mutateAsync({
        path: `/stores/${store.id}`,
        init: { method: "DELETE" },
      });
      reload();
    } catch (reason) {
      setError(errorText(reason));
    } finally {
      setDeletingId(null);
    }
  };
  return (
    <>
      {error && <div className="page-error">{error}</div>}
      <div className="section-actions">
        <span>
          {visibleCount} торговых точек
          {selectedOrganizationId &&
            " · " + (visibleOrganizations[0]?.legalName ?? "")}
        </span>
        <div className="inline-actions">
          <select
            className="store-organization-filter"
            value={selectedOrganizationId ?? ""}
            aria-label="Фильтр по организации"
            onChange={(event) => {
              const value = Number(event.target.value) || null;
              setOrganizationFilter(value);
            }}
          >
            <option value="">Все организации</option>
            {organizations.map((organization) => (
              <option value={organization.id} key={organization.id}>
                {organization.legalName}
              </option>
            ))}
          </select>
          {selectedOrganizationId && (
            <Button
              kind="secondary"
              onClick={() => {
                setOrganizationFilter(null);
              }}
            >
              Все организации
            </Button>
          )}
          <Button onClick={() => setAdding(true)}>
            <Plus /> Добавить точку
          </Button>
        </div>
      </div>
      <StoreGroups
        groups={groups}
        user={user}
        deletingId={deletingId}
        select={setSelected}
        approve={approve}
        reject={reject}
        remove={(store) => void remove(store)}
      />
      {!groups.length && (
        <Empty
          title="Торговых точек нет"
          text="Добавьте первую точку для этой организации."
        />
      )}
      {adding && (
        <StoreCreateDialog
          organizations={organizations}
          selectedOrganizationId={selectedOrganizationId}
          close={() => setAdding(false)}
          submit={submit}
        />
      )}
      {selected && (
        <StoreDetails
          store={selected}
          user={user}
          close={() => setSelected(null)}
          loadAccess={getStoreAccess}
          saveAccessRequest={(storeId, values) =>
            saveAccessMutation.mutateAsync({ storeId, values })
          }
        />
      )}
    </>
  );
}
