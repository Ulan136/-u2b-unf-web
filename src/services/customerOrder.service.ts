import { z } from "zod";
import * as repo from "@/repositories/customerOrders.repo";
import { applyMove, getBalance } from "@/repositories/stock.repo";
import { ensureDefaultWarehouse } from "@/repositories/products.repo";
import { sumPaidBySource } from "@/repositories/money.repo";

/** Бизнес-логика документа «Заказ покупателя». Считает суммы строк и итог. */

const itemSchema = z.object({
  productId: z.string().uuid(),
  qty: z.coerce.number().positive("Количество должно быть > 0"),
  price: z.coerce.number().nonnegative(),
});

const baseSchema = z.object({
  orderDate: z.coerce.date().optional(),
  counterpartyId: z.string().uuid("Выберите контрагента"),
  warehouseId: z.string().uuid().optional().nullable(),
  status: z.enum(["Новый", "В работе", "Выполнен", "Отменён"]).optional(),
  comment: z.string().optional().nullable(),
  items: z.array(itemSchema).default([]),
});

export const orderCreateSchema = baseSchema;
export const orderUpdateSchema = baseSchema;

/** Пересчёт строк (сумма = кол-во × цена) и общего итога. */
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
  if (!order) throw new Error("Заказ не найден");
  const items = await repo.getItems(id);
  const paid = await sumPaidBySource("customer_order", id);
  return { order: { ...order, paid }, items };
}

export async function create(body: unknown) {
  const data = orderCreateSchema.parse(body);
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
  const data = orderUpdateSchema.parse(body);
  const existing = await repo.findById(id);
  if (!existing) throw new Error("Заказ не найден");
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
  if (!existing) throw new Error("Заказ не найден");
  return repo.archive(id);
}

/**
 * Отгрузка по заказу: списывает товары со склада (движения OUT) и помечает
 * заказ отгруженным. Перед списанием проверяет достаточность остатков —
 * либо отгружаем весь заказ, либо ничего (не оставляем частичную отгрузку).
 */
export async function shipOrder(id: string) {
  const order = await repo.findById(id);
  if (!order) throw new Error("Заказ не найден");
  if (order.shippedAt) throw new Error("Заказ уже отгружен");

  const items = await repo.getItems(id);
  if (!items.length) throw new Error("В заказе нет товаров для отгрузки");

  const warehouseId =
    order.warehouseId ?? (await ensureDefaultWarehouse()).id;

  // Предварительная проверка остатков по всем строкам.
  const shortages: string[] = [];
  for (const it of items) {
    const bal = await getBalance(it.productId, warehouseId);
    const free = Number(bal?.qty ?? 0) - Number(bal?.reserved ?? 0);
    if (free < Number(it.qty)) {
      shortages.push(`${it.productName}: нужно ${it.qty}, свободно ${free}`);
    }
  }
  if (shortages.length) {
    throw new Error("Недостаточно остатков для отгрузки — " + shortages.join("; "));
  }

  const docNumber = `ЗП-${String(order.seq).padStart(5, "0")}`;
  for (const it of items) {
    await applyMove({
      productId: it.productId,
      moveType: "OUT",
      qty: it.qty,
      price: it.price,
      warehouseId,
      docNo: docNumber,
      comment: `Отгрузка по заказу ${docNumber}`,
      author: "web",
    });
  }

  return repo.updateHeader(id, {
    shippedAt: new Date(),
    status: "Выполнен",
  });
}
