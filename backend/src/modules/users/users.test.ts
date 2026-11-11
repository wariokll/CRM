import { Role, UserStatus } from "@prisma/client";
import bcrypt from "bcrypt";
import request from "supertest";
import { afterAll, describe, expect, it } from "vitest";
import { createApp } from "../../app.js";
import { prisma } from "../../db.js";
import { createAccessToken } from "../../utils/tokens.js";

const app = createApp({ prisma, requestLogger: (_req, _res, next) => next() });
const suffix = `${Date.now()}`;
const userIds: number[] = [];
let adminSequence = 0;
let clientSequence = 0;

async function createAdminToken() {
  adminSequence += 1;
  const admin = await prisma.user.create({
    data: {
      ipName: "User route administrator",
      email: `users-admin-${suffix}-${adminSequence}@example.test`,
      passwordHash: "not-used-by-access-token-tests",
      phone: `+7333${suffix.slice(-7)}${adminSequence}`,
      role: Role.DIRECTOR,
      status: UserStatus.ACTIVE,
    },
  });
  userIds.push(admin.id);
  return createAccessToken({ userId: admin.id, role: admin.role });
}

async function createClient(token: string) {
  clientSequence += 1;
  const created = await request(app)
    .post("/api/users")
    .set("Authorization", `Bearer ${token}`)
    .send({
      ipName: `User module client ${suffix}`,
      email: `users-client-${suffix}-${clientSequence}@example.test`,
      phone: `+7222${suffix.slice(-6)}${clientSequence}`,
      password: "Initial-Client-Password-123",
      store: {
        name: `User store ${suffix}`,
        address: "Test address 123",
        phone: `+7223${suffix.slice(-6)}${clientSequence}`,
      },
    });
  expect(created.status).toBe(201);
  userIds.push(created.body.id);
  return created.body as { id: number; email: string; passwordHash?: string };
}

afterAll(async () => {
  if (userIds.length)
    await prisma.user.deleteMany({ where: { id: { in: userIds } } });
});

describe("users endpoint behavior", () => {
  it("creates a client with an active organization and store and supports search", async () => {
    const token = await createAdminToken();
    const created = await createClient(token);

    const organization = await prisma.organization.findFirstOrThrow({
      where: { email: created.email },
      include: { stores: true },
    });
    expect(organization.status).toBe("ACTIVE");
    expect(organization.stores).toHaveLength(1);
    expect(organization.stores[0].status).toBe("ACTIVE");

    const search = await request(app)
      .get(`/api/users?search=${encodeURIComponent(created.email)}`)
      .set("Authorization", `Bearer ${token}`);
    expect(search.status).toBe(200);
    expect(search.body).toHaveLength(1);
    expect(search.body[0]).toMatchObject({
      id: created.id,
      email: created.email,
      role: Role.CLIENT,
      stores: [{ id: organization.stores[0].id }],
    });
  });

  it("requires a rejection reason and stores status changes", async () => {
    const token = await createAdminToken();
    const client = await createClient(token);
    const invalid = await request(app)
      .patch(`/api/users/${client.id}/status`)
      .set("Authorization", `Bearer ${token}`)
      .send({ status: UserStatus.REJECTED });
    expect(invalid.status).toBe(400);

    const rejected = await request(app)
      .patch(`/api/users/${client.id}/status`)
      .set("Authorization", `Bearer ${token}`)
      .send({
        status: UserStatus.REJECTED,
        rejectionReason: "Incomplete data",
      });
    expect(rejected.status).toBe(200);
    expect(rejected.body).toMatchObject({
      id: client.id,
      status: UserStatus.REJECTED,
      rejectionReason: "Incomplete data",
    });
  });

  it("updates a client password without returning a response body", async () => {
    const token = await createAdminToken();
    const client = await createClient(token);
    const response = await request(app)
      .patch(`/api/users/${client.id}/password`)
      .set("Authorization", `Bearer ${token}`)
      .send({ password: "Updated-Client-Password-456" });

    expect(response.status).toBe(204);
    expect(response.text).toBe("");
    const stored = await prisma.user.findUniqueOrThrow({
      where: { id: client.id },
      select: { passwordHash: true },
    });
    await expect(
      bcrypt.compare("Updated-Client-Password-456", stored.passwordHash),
    ).resolves.toBe(true);
  });
});
