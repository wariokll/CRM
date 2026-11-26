import { UserStatus } from "@prisma/client";

export function present<
  T extends {
    organization: {
      legalName: string;
      members: Array<{
        user: {
          id: number;
          ipName: string;
          phone: string;
          status: UserStatus;
        };
      }>;
    };
  },
>(store: T): T & { user: T["organization"]["members"][number]["user"] } {
  return {
    ...store,
    user: store.organization.members[0]?.user ?? {
      id: 0,
      ipName: store.organization.legalName,
      phone: "",
      status: "ACTIVE",
    },
  };
}
