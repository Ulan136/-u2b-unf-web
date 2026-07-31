import { z } from "zod";
import * as repo from "@/repositories/specifications.repo";

/** Бизнес-логика справочника «Спецификации» (состав изделия). */

const itemSchema = z.object({
  materialProductId: z.string().uuid(),
  qty: z.coerce.number().positive("Количество материала должно быть > 0"),
});

const baseSchema = z.object({
  productId: z.string().uuid("Выберите изделие"),
  name: z.string().trim().min(1).max(200).optional(),
  outputQty: z.coerce.number().positive().optional(),
  items: z.array(itemSchema).default([]),
});

export const specCreateSchema = baseSchema;
export const specUpdateSchema = baseSchema;

function toRows(items: z.infer<typeof itemSchema>[]) {
  return items.map((it) => ({
    materialProductId: it.materialProductId,
    qty: String(it.qty),
  }));
}

export function list() {
  return repo.listSpecs();
}

export async function get(id: string) {
  const spec = await repo.getById(id);
  if (!spec) throw new Error("Спецификация не найдена");
  const items = await repo.getItems(id);
  return { spec, items };
}

export async function create(body: unknown) {
  const data = specCreateSchema.parse(body);
  if (data.items.length === 0) {
    throw new Error("Добавьте хотя бы один материал");
  }
  return repo.createSpec(
    {
      productId: data.productId,
      name: data.name ?? "Основная",
      outputQty: data.outputQty ? String(data.outputQty) : "1",
    },
    toRows(data.items)
  );
}

export async function update(id: string, body: unknown) {
  const data = specUpdateSchema.parse(body);
  const existing = await repo.findById(id);
  if (!existing) throw new Error("Спецификация не найдена");
  await repo.replaceItems(id, toRows(data.items));
  return repo.updateHeader(id, {
    productId: data.productId,
    name: data.name,
    outputQty: data.outputQty ? String(data.outputQty) : undefined,
  });
}

export async function archive(id: string) {
  const existing = await repo.findById(id);
  if (!existing) throw new Error("Спецификация не найдена");
  return repo.archive(id);
}
