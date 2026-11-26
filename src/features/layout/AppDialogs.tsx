import { CreateRequestForm } from "../requests/CreateRequestForm";
import { RequestModal } from "../requests/RequestModal";
import type {
  Department,
  Organization,
  RequestType,
  ServiceRequest,
  Store,
  User,
} from "../../types";

type Props = {
  user: User;
  departments: Department[];
  organizations: Organization[];
  stores: Store[];
  types: RequestType[];
  selected: ServiceRequest | null;
  createRequest: boolean;
  calendarDate: Date | null;
  reload: () => void;
  closeRequest: () => void;
  closeCreateRequest: () => void;
};

export function AppDialogs({
  user,
  departments,
  organizations,
  stores,
  types,
  selected,
  createRequest,
  calendarDate,
  reload,
  closeRequest,
  closeCreateRequest,
}: Props) {
  return (
    <>
      {selected && (
        <RequestModal
          item={selected}
          user={user}
          departments={departments}
          close={closeRequest}
          reload={reload}
        />
      )}
      {createRequest && (
        <CreateRequestForm
          organizations={organizations}
          stores={stores}
          types={types}
          user={user}
          close={closeCreateRequest}
          reload={reload}
          initialUrgency={calendarDate ? "SCHEDULED" : "URGENT"}
          initialScheduledAt={calendarDate}
        />
      )}
    </>
  );
}
