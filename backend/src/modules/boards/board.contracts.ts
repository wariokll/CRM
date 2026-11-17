import { z } from "zod";
import { BoardType } from "@prisma/client";

export const boardIdSchema = z.coerce.number().int().positive();
export const boardNameSchema = z.string().trim().min(1).max(120);
export const boardTitleSchema = z.string().trim().min(1).max(200);
export const boardDeadlineSchema = z
  .string()
  .regex(/^\d{4}-\d{2}-\d{2}$/)
  .refine(
    (value) => !Number.isNaN(Date.parse(`${value}T00:00:00.000Z`)),
    "Некорректная дата",
  );
export const boardVersionSchema = z.number().int().positive();
export const createBoardSchema = z.object({
  name: boardNameSchema,
  type: z.nativeEnum(BoardType),
});
export const updateBoardNameSchema = z.object({ name: boardNameSchema });
export const boardUserAccessSchema = z.object({ userId: boardIdSchema });
export const updateColumnSchema = z.object({
  name: boardNameSchema,
  version: boardVersionSchema,
});
export const versionBodySchema = z.object({ version: boardVersionSchema });
export const columnPositionSchema = z.object({
  position: z.number().int().min(0),
  version: boardVersionSchema,
});
export const createCardSchema = z.object({
  title: boardTitleSchema,
  description: z.string().max(5000).optional().default(""),
  deadline: boardDeadlineSchema.nullable().optional(),
});
export const updateCardSchema = createCardSchema.extend({
  version: boardVersionSchema,
});
export const moveCardSchema = z.object({
  targetColumnId: boardIdSchema,
  position: z.number().int().min(0),
  version: boardVersionSchema,
});

const columnLayoutSchema = z
  .object({
    id: z.number().int().positive(),
    version: z.number().int().positive(),
    width: z.number().int().min(240).max(1800),
    cardsPerRow: z.number().int().min(1).max(6),
  })
  .refine(
    ({ width, cardsPerRow }) =>
      width >= 24 + cardsPerRow * 160 + (cardsPerRow - 1) * 8,
    {
      message: "Увеличьте ширину столбца для выбранного числа карточек",
      path: ["width"],
    },
  );

export const boardLayoutSchema = z.object({
  columns: z
    .array(columnLayoutSchema)
    .min(1)
    .refine(
      (columns) =>
        new Set(columns.map((column) => column.id)).size === columns.length,
      "Столбцы не должны повторяться",
    ),
});

export const restoreCardSchema = z.object({
  version: z.number().int().positive(),
  targetColumnId: z.number().int().positive(),
});

export type BoardLayoutInput = z.infer<typeof boardLayoutSchema>;
export type RestoreCardInput = z.infer<typeof restoreCardSchema>;
