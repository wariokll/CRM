import { Role, UserStatus } from "@prisma/client";
import request from "supertest";
import { afterAll, beforeEach, describe, expect, it } from "vitest";
import { createApp } from "../../app.js";
import { prisma } from "../../db.js";
import { createAccessToken } from "../../utils/tokens.js";

const app = createApp({
  prisma,
  requestLogger: (_req, _res, next) => next(),
});
const createdScheduleIds: number[] = [];
const createdUserIds: number[] = [];
let userSequence = 0;

async function createTestUser(role: Role) {
  userSequence += 1;
  const user = await prisma.user.create({
    data: {
      ipName: `Recurring route ${role}`,
      email: `recurring-route-${Date.now()}-${userSequence}@example.test`,
      passwordHash: "not-used-by-access-token-tests",
      phone: `+7999${String(Date.now()).slice(-7)}${userSequence}`,
      role,
      status: UserStatus.ACTIVE,
    },
  });
  createdUserIds.push(user.id);
  return { token: createAccessToken({ userId: user.id, role: user.role }) };
}

async function createSchedule(departmentId = 900_001, isActive = true) {
  const schedule = await prisma.recurringRequestSchedule.create({
    data: {
      typeId: 900_001,
      departmentId,
      description: "Recurring request route characterization",
      intervalDays: 7,
      nextScheduledAt: new Date("2030-01-01T00:00:00.000Z"),
      createdById: 900_001,
      isActive,
    },
  });
  createdScheduleIds.push(schedule.id);
  return schedule;
}

beforeEach(async () => {
  if (createdScheduleIds.length) {
    await prisma.recurringRequestSchedule.deleteMany({
      where: { id: { in: createdScheduleIds.splice(0) } },
    });
  }
});

afterAll(async () => {
  if (createdScheduleIds.length) {
    await prisma.recurringRequestSchedule.deleteMany({
      where: { id: { in: createdScheduleIds } },
    });
  }
  if (createdUserIds.length) {
    await prisma.user.deleteMany({ where: { id: { in: createdUserIds } } });
  }
});

describe("POST /api/recurring-requests/:id/stop", () => {
  it("rejects clients before looking up the schedule", async () => {
    const client = await createTestUser(Role.CLIENT);
    const response = await request(app)
      .post("/api/recurring-requests/987654/stop")
      .set("Authorization", `Bearer ${client.token}`);

    expect(response.status).toBe(403);
  });

  it("returns 404 when the schedule does not exist", async () => {
    const director = await createTestUser(Role.DIRECTOR);
    const response = await request(app)
      .post("/api/recurring-requests/987654/stop")
      .set("Authorization", `Bearer ${director.token}`);

    expect(response.status).toBe(404);
  });

  it("stops an active schedule and returns an empty 204 response", async () => {
    const director = await createTestUser(Role.DIRECTOR);
    const schedule = await createSchedule();
    const response = await request(app)
      .post(`/api/recurring-requests/${schedule.id}/stop`)
      .set("Authorization", `Bearer ${director.token}`);

    expect(response.status).toBe(204);
    expect(response.text).toBe("");
    await expect(
      prisma.recurringRequestSchedule.findUniqueOrThrow({
        where: { id: schedule.id },
        select: { isActive: true },
      }),
    ).resolves.toEqual({ isActive: false });
  });

  it("does not update an already inactive schedule", async () => {
    const director = await createTestUser(Role.DIRECTOR);
    const schedule = await createSchedule(900_001, false);
    const response = await request(app)
      .post(`/api/recurring-requests/${schedule.id}/stop`)
      .set("Authorization", `Bearer ${director.token}`);

    expect(response.status).toBe(204);
    await expect(
      prisma.recurringRequestSchedule.findUniqueOrThrow({
        where: { id: schedule.id },
        select: { isActive: true },
      }),
    ).resolves.toEqual({ isActive: false });
  });

  it("denies a staff role that cannot manage the schedule department", async () => {
    const master = await createTestUser(Role.MASTER);
    const schedule = await createSchedule();
    const response = await request(app)
      .post(`/api/recurring-requests/${schedule.id}/stop`)
      .set("Authorization", `Bearer ${master.token}`);

    expect(response.status).toBe(403);
  });
});
