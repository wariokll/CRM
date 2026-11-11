import { DepartmentMembershipRole, Role, UserStatus } from "@prisma/client";
import request from "supertest";
import { afterAll, describe, expect, it } from "vitest";
import { createApp } from "../../app.js";
import { prisma } from "../../db.js";
import { createAccessToken } from "../../utils/tokens.js";

const app = createApp({ prisma, requestLogger: (_req, _res, next) => next() });
const suffix = `${Date.now()}`;
const userIds: number[] = [];
const departmentIds: number[] = [];
let sequence = 0;

async function createDirector() {
  sequence += 1;
  const user = await prisma.user.create({
    data: {
      ipName: "Staff route director",
      email: `staff-director-${suffix}-${sequence}@example.test`,
      passwordHash: "not-used-by-access-token-tests",
      phone: `+7001${suffix.slice(-7)}${sequence}`,
      role: Role.DIRECTOR,
      status: UserStatus.ACTIVE,
    },
  });
  userIds.push(user.id);
  return {
    user,
    token: createAccessToken({ userId: user.id, role: user.role }),
  };
}

afterAll(async () => {
  if (userIds.length)
    await prisma.user.deleteMany({ where: { id: { in: userIds } } });
  if (departmentIds.length)
    await prisma.department.deleteMany({
      where: { id: { in: departmentIds } },
    });
});

describe("staff endpoint behavior", () => {
  it("creates staff with the requested department membership role", async () => {
    const director = await createDirector();
    const department = await prisma.department.create({
      data: {
        name: `Staff department ${suffix}`,
        slug: `staff-department-${suffix}`,
      },
    });
    departmentIds.push(department.id);

    const response = await request(app)
      .post("/api/staff")
      .set("Authorization", `Bearer ${director.token}`)
      .send({
        name: `Master ${suffix}`,
        email: `staff-master-${suffix}@example.test`,
        phone: `+7002${suffix.slice(-7)}`,
        password: "Staff-Password-123",
        role: Role.MASTER,
        departmentIds: [department.id],
      });

    expect(response.status).toBe(201);
    expect(response.body).toMatchObject({
      ipName: `Master ${suffix}`,
      role: Role.MASTER,
      status: UserStatus.ACTIVE,
      departmentMemberships: [
        {
          departmentId: department.id,
          membershipRole: DepartmentMembershipRole.MASTER,
        },
      ],
    });
    expect(response.body.passwordHash).toBeUndefined();
    userIds.push(response.body.id);
  });

  it("prevents a director from removing their own director role", async () => {
    const director = await createDirector();
    const response = await request(app)
      .put(`/api/staff/${director.user.id}/access`)
      .set("Authorization", `Bearer ${director.token}`)
      .send({ role: Role.MASTER, departments: [], permissions: [] });

    expect(response.status).toBe(400);
    expect(response.body.message).toEqual(expect.any(String));
  });
});
