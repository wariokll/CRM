import { Role } from "@prisma/client";
import { afterAll, beforeEach, describe, expect, it } from "vitest";
import { prisma } from "../db.js";
import {
  clearApiDatabase,
  createApiDepartment,
  createApiUser,
} from "./api-test-app.js";
import { send } from "./api-characterization.helpers.js";

beforeEach(clearApiDatabase);

afterAll(async () => {
  await prisma.$disconnect();
});

describe("catalog API characterization", () => {
  it("preserves role and permission behavior for shared catalog endpoints", async () => {
    const users = new Map<Role, string>();
    for (const role of Object.values(Role)) {
      users.set(role, (await createApiUser(role)).token);
    }

    for (const role of Object.values(Role)) {
      const token = users.get(role)!;
      const catalog = await send(["GET", "/api/components"], token);
      const departments = await send(["GET", "/api/departments"], token);
      expect(catalog.status, `${role} components`).toBe(200);
      expect(departments.status, `${role} departments`).toBe(200);
    }

    const createdComponent = await send(
      ["POST", "/api/components"],
      users.get(Role.DIRECTOR),
    ).send({ name: "Тестовый компонент" });
    expect(createdComponent.status).toBe(201);
    expect(createdComponent.body.name).toBe("Тестовый компонент");

    for (const role of [Role.MASTER, Role.CLIENT]) {
      const response = await send(
        ["POST", "/api/components"],
        users.get(role),
      ).send({
        name: "Запрещённый компонент",
      });
      expect(response.status, `${role} cannot manage templates`).toBe(403);
    }

    const director = users.get(Role.DIRECTOR)!;
    const departmentHead = await createApiUser(Role.DEPARTMENT_HEAD);
    const allowedDepartmentHead = await send(
      ["POST", "/api/components"],
      departmentHead.token,
    ).send({ name: "Доступный компонент" });
    expect(allowedDepartmentHead.status).toBe(201);

    const department = await createApiDepartment("Сервисный", "service-test");
    const createdType = await send(
      ["POST", "/api/request-types"],
      director,
    ).send({
      name: "Тестовый тип",
      departmentId: department.id,
    });
    expect(createdType.status).toBe(201);
    expect(createdType.body).toMatchObject({
      name: "Тестовый тип",
      departmentId: department.id,
      requiresOrganization: true,
      requiresStore: true,
      templateFields: [],
    });
  });
});
