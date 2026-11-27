import type { FormEvent } from "react";
import { Button, Field, Modal } from "../../../components/ui";
import type { Organization } from "../../../types";

export function StoreCreateDialog({
  organizations,
  selectedOrganizationId,
  close,
  submit,
}: {
  organizations: Organization[];
  selectedOrganizationId: number | null;
  close: () => void;
  submit: (event: FormEvent<HTMLFormElement>) => void;
}) {
  return (
    <Modal title="Новая торговая точка" close={() => close()}>
      <form onSubmit={submit}>
        <Field label="Организация">
          <select
            name="organizationId"
            required
            defaultValue={selectedOrganizationId ?? undefined}
          >
            {organizations
              .filter((organization) => organization.status === "ACTIVE")
              .map((organization) => (
                <option value={organization.id} key={organization.id}>
                  {organization.legalName}
                </option>
              ))}
          </select>
        </Field>
        <Field label="Название">
          <input name="name" required minLength={2} />
        </Field>
        <Field label="Адрес">
          <input name="address" required minLength={5} />
        </Field>
        <Field label="Телефон">
          <input name="phone" />
        </Field>
        <div className="modal-actions">
          <Button type="button" kind="secondary" onClick={() => close()}>
            Отмена
          </Button>
          <Button>Сохранить</Button>
        </div>
      </form>
    </Modal>
  );
}
