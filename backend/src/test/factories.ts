import { Role, UserStatus } from "@prisma/client";
import { prisma } from "../db.js";
import { createAccessToken } from "../utils/tokens.js";

let nextEmailId = 0;

export async function createUser(
  role: Role,
  overrides: { status?: UserStatus } = {},
) {
  nextEmailId += 1;
  const user = await prisma.user.create({
    data: {
      ipName: `Test ${role}`,
      email: `test-${role.toLowerCase()}-${nextEmailId}@example.test`,
      passwordHash: "not-used-by-access-token-tests",
      phone: `+7000000${String(nextEmailId).padStart(4, "0")}`,
      role,
      status: overrides.status ?? UserStatus.ACTIVE,
    },
    select: { id: true, role: true, email: true },
  });

  return {
    user,
    token: createAccessToken({ userId: user.id, role: user.role }),
  };
}

export async function createDepartment(name: string, slug: string) {
  return prisma.department.create({ data: { name, slug } });
}
