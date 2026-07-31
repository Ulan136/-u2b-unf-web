import { z } from "zod";
import * as repo from "@/repositories/receipts.repo";
import { applyMove } from "@/repositories/stock.repo";
import { ensureDefaultWarehouse } from "@/repositories/products.repo";
import { sumPaidBySource } from "@/repositories/money.repo";

/** Бизнес-логика документа «Поступление» (приходная накладная). */

const itemSchema = z.object({
  productId: z.string().uuid(),
  qty: z.coerce.number().positive("Количество должно быть > 0"),
  price: z.coerce.number().nonnegative(),
});

const baseSchema = z.object({
  receiptDate: z.coerce.date().optional(),
  counterpartyId: z.string().uuid("Выберите поставщика"),
  warehouseId: z.string().uuid().optional().nullable(),
  status: z.enum(["Новый", "В работе", "Выполнен", "Отменён"]).optional(),
  comment: z.string().optional().nullable(),
  items: z.array(itemSchema).default([]),
});

export const receiptCreateSchema = baseSchema;
export const receiptUpdateSchema = baseSchema;

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
  return repo.listReceipts();
}

export async function get(id: string) {
  const receipt = await repo.getById(id);
  if (!receipt) throw new Error("Поступление не найдено");
  const items = await repo.getItems(id);
  const paid = await sumPaidBySource("receipt", id);
  return { receipt: { ...receipt, paid }, items };
}

export async function create(body: unknown) {
  const data = receiptCreateSchema.parse(body);
  const { rows, total } = computeItems(data.items);
  return repo.createReceipt(
    {
      receiptDate: data.receiptDate,
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
  const data = receiptUpdateSchema.parse(body);
  const existing = await repo.findById(id);
  if (!existing) throw new Error("Поступление не найдено");
  const { rows, total } = computeItems(data.items);
  await repo.replaceItems(id, rows);
  return repo.updateHeader(id, {
    receiptDate: data.receiptDate,
    counterpartyId: data.counterpartyId,
    warehouseId: data.warehouseId ?? null,
    status: data.status,
    comment: data.comment ?? null,
    totalSum: total,
  });
}

export async function archive(id: string) {
  const existing = await repo.findById(id);
  if (!existing) throw new Error("Поступление не найдено");
  return repo.archive(id);
}

/**
 * Оприходование: добавляет товары на склад (движения IN) и помечает
 * поступление проведённым. Защита от повторного проведения.
 */
export async function receiveReceipt(id: string) {
  const receipt = await repo.findById(id);
  if (!receipt) throw new Error("Поступление не найдено");
  if (receipt.receivedAt) throw new Error("Поступление уже оприходовано");

  const items = await repo.getItems(id);
  if (!items.length) throw new Error("В поступлении нет товаров");

  const warehouseId =
    receipt.warehouseId ?? (await ensureDefaultWarehouse()).id;
  const docNumber = `ПН-${String(receipt.seq).padStart(5, "0")}`;

  for (const it of items) {
    await applyMove({
      productId: it.productId,
      moveType: "IN",
      qty: it.qty,
      price: it.price,
      warehouseId,
      docNo: docNumber,
      comment: `Поступление ${docNumber}`,
      author: "web",
    });
  }

  return repo.updateHeader(id, {
    receivedAt: new Date(),
    status: "Выполнен",
  });
}
