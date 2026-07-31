import { z } from "zod";
import * as repo from "@/repositories/purchaseOrders.repo";

/** Бизнес-логика документа «Заказ поставщику» (план закупки, без движений склада). */

const itemSchema = z.object({
  productId: z.string().uuid(),
  qty: z.coerce.number().positive("Количество должно быть > 0"),
  price: z.coerce.number().nonnegative(),
});

const baseSchema = z.object({
  orderDate: z.coerce.date().optional(),
  counterpartyId: z.string().uuid("Выберите поставщика"),
  warehouseId: z.string().uuid().optional().nullable(),
  status: z.enum(["Новый", "В работе", "Выполнен", "Отменён"]).optional(),
  comment: z.string().optional().nullable(),
  items: z.array(itemSchema).default([]),
});

export const poCreateSchema = baseSchema;
export const poUpdateSchema = baseSchema;

function computeItems(items: z.infer<typeof itemSchema>[]) {
  let total = 0;
  const rows = items.map((it) => {
    const amount = it.qty * it.price;
    total += amount;
    return {
      productId: it.productId,
      qty: String(it.qty),
      price: String(it.price),
      amount: amount.toFixed(2),
    };
  });
  return { rows, total: total.toFixed(2) };
}

export function list() {
  return repo.listOrders();
}

export async function get(id: string) {
  const order = await repo.getById(id);
  if (!order) throw new Error("Заказ поставщику не найден");
  const items = await repo.getItems(id);
  return { order, items };
}

export async function create(body: unknown) {
  const data = poCreateSchema.parse(body);
  const { rows, total } = computeItems(data.items);
  return repo.createOrder(
    {
      orderDate: data.orderDate,
      counterpartyId: data.counterpartyId,
      warehouseId: data.warehouseId ?? null,
      status: data.status ?? "Новый",
      comment: data.comment ?? null,
      totalSum: total,
    },
    rows
  );
}

export async function update(id: string, body: unknown) {
  const data = poUpdateSchema.parse(body);
  const existing = await repo.findById(id);
  if (!existing) throw new Error("Заказ поставщику не найден");
  const { rows, total } = computeItems(data.items);
  await repo.replaceItems(id, rows);
  return repo.updateHeader(id, {
    orderDate: data.orderDate,
    counterpartyId: data.counterpartyId,
    warehouseId: data.warehouseId ?? null,
    status: data.status,
    comment: data.comment ?? null,
    totalSum: total,
  });
}

export async function archive(id: string) {
  const existing = await repo.findById(id);
  if (!existing) throw new Error("Заказ поставщику не найден");
  return repo.archive(id);
}
