import { PermissionKey } from "@prisma/client";
import { Router } from "express";
import { z } from "zod";
import { prisma } from "../db.js";
import { authenticate } from "../middleware/auth.js";
import { requirePermission } from "../utils/permissions.js";

export const componentsRouter = Router();
componentsRouter.use(authenticate);

componentsRouter.get("/", async (_req, res) => {
  res.json(
    await prisma.component.findMany({
      orderBy: [{ isActive: "desc" }, { name: "asc" }],
    }),
  );
});

componentsRouter.post(
  "/",
  requirePermission(PermissionKey.MANAGE_TEMPLATES),
  async (req, res) => {
    const body = z
      .object({ name: z.string().trim().min(2).max(200) })
      .parse(req.body);
    res.status(201).json(await prisma.component.create({ data: body }));
  },
);

componentsRouter.patch(
  "/:id",
  requirePermission(PermissionKey.MANAGE_TEMPLATES),
  async (req, res) => {
    const body = z
      .object({
        name: z.string().trim().min(2).max(200).optional(),
        isActive: z.boolean().optional(),
      })
      .parse(req.body);
    res.json(
      await prisma.component.update({
        where: { id: Number(req.params.id) },
        data: body,
      }),
    );
  },
);
