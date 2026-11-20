import { fireEvent, render, waitFor } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { AccessDialog } from "./boards/BoardAccessDialog";
import { StoreDetails } from "./stores/StoreDetails";
import type { BoardAccessUser, Store, User } from "../types";

const user: User = {
  id: 1,
  ipName: "Staff",
  email: "staff@example.test",
  phone: "",
  role: "MASTER",
  status: "ACTIVE",
  createdAt: "2026-01-01T00:00:00.000Z",
};

describe("feature components delegate requests through callbacks", () => {
  it("asks its container to update board access", async () => {
    const member: BoardAccessUser = {
      id: 2,
      ipName: "Another staff member",
      email: "another@example.test",
      role: "MASTER",
      hasAccess: false,
      isOwner: false,
    };
    const updateAccess = vi.fn().mockResolvedValue(undefined);
    const { container } = render(
      <AccessDialog
        users={[member]}
        loadError=""
        close={vi.fn()}
        updateAccess={updateAccess}
      />,
    );

    fireEvent.click(container.querySelector(".board-access-list button")!);

    await waitFor(() => expect(updateAccess).toHaveBeenCalledWith(member));
  });

  it("delegates store access saving to its container", async () => {
    const store: Store = {
      id: 5,
      name: "Shop",
      address: "Main street",
      organizationId: 1,
      status: "ACTIVE",
    };
    const saveAccessRequest = vi.fn().mockResolvedValue(undefined);
    const { container } = render(
      <StoreDetails
        store={store}
        user={user}
        close={vi.fn()}
        loadAccess={vi.fn().mockResolvedValue(null)}
        saveAccessRequest={saveAccessRequest}
      />,
    );
    fireEvent.change(container.querySelector('input[name="anydeskId"]')!, {
      target: { value: "12345" },
    });
    fireEvent.submit(container.querySelector(".access-form")!);

    await waitFor(() =>
      expect(saveAccessRequest).toHaveBeenCalledWith(5, { anydeskId: "12345" }),
    );
  });
});
