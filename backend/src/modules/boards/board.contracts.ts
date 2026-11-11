import { z } from "zod";

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
