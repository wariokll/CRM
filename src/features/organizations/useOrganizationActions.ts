import { useState, type FormEvent } from "react";
import { ApiError } from "../../api";
import type { Organization } from "../../types";
import { useOrganizationMutation } from "./queries";

type ContactDraft = { fullName: string; phone: string; note: string };

function errorText(reason: unknown) {
  return reason instanceof ApiError || reason instanceof Error
    ? reason.message
    : "Request failed";
}

export function useOrganizationActions(
  setAdding: (open: boolean) => void,
  reload: () => void,
) {
  const [error, setError] = useState("");
  const [deletingId, setDeletingId] = useState<number | null>(null);
  const [contacts, setContacts] = useState<ContactDraft[]>([
    { fullName: "", phone: "", note: "" },
  ]);
  const organizationMutation = useOrganizationMutation();

  const submit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const values = Object.fromEntries(new FormData(event.currentTarget));
    try {
      await organizationMutation.mutateAsync({
        path: "/organizations",
        init: {
          method: "POST",
          body: JSON.stringify({
            ...values,
            contacts: contacts.filter((contact) => contact.fullName.trim()),
          }),
        },
      });
      setAdding(false);
      setContacts([{ fullName: "", phone: "", note: "" }]);
      reload();
    } catch (reason) {
      setError(errorText(reason));
      return;
    }
  };

  const approve = async (id: number) => {
    try {
      setError("");
      await organizationMutation.mutateAsync({
        path: `/organizations/${id}/approve`,
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
      await organizationMutation.mutateAsync({
        path: `/organizations/${id}/reject`,
        init: { method: "POST", body: JSON.stringify({ rejectionReason }) },
      });
      reload();
    } catch (reason) {
      setError(errorText(reason));
    }
  };

  const remove = async (organization: Organization) => {
    const storesCount = organization.stores?.length ?? 0;
    if (
      !window.confirm(
        `Удалить организацию «${organization.legalName}»? Будут удалены связанные точки (${storesCount}), а заявки сохранятся без связи с организацией и точками.`,
      )
    )
      return;
    try {
      setError("");
      setDeletingId(organization.id);
      await organizationMutation.mutateAsync({
        path: `/organizations/${organization.id}`,
        init: { method: "DELETE" },
      });
      reload();
    } catch (reason) {
      setError(errorText(reason));
    } finally {
      setDeletingId(null);
    }
  };

  return {
    error,
    deletingId,
    contacts,
    setContacts,
    submit,
    approve,
    reject,
    remove,
  };
}
