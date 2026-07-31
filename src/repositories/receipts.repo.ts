import { desc, eq } from "drizzle-orm";
import { getDb } from "@/lib/db";
import {
  counterparties,
  receipts,
  receiptItems,
  products,
  warehouses,
} from "@/db/schema";

/** ТОЛЬКО запросы Drizzle по документу «Поступление» (приходная накладная). */

export type ReceiptHeader = {
  receiptDate?: Date;
  counterpartyId: string;
  warehouseId?: string | null;
  status?: "Новый" | "В работе" | "Выполнен" | "Отменён";
  comment?: string | null;
  totalSum: string;
};

export type ReceiptItemRow = {
  productId: string;
  qty: string;
  price: string;
  amount: string;
};

export async function listReceipts() {
  const db = getDb();
  return db
    .select({
      id: receipts.id,
      seq: receipts.seq,
      receiptDate: receipts.receiptDate,
      status: receipts.status,
      totalSum: receipts.totalSum,
      counterpartyId: receipts.counterpartyId,
      supplierName: counterparties.name,
    })
    .from(receipts)
    .innerJoin(counterparties, eq(counterparties.id, receipts.counterpartyId))
    .where(eq(receipts.isActive, true))
    .orderBy(desc(receipts.seq))
    .limit(500);
}

export async function getById(id: string) {
  const db = getDb();
  const [row] = await db
    .select({
      id: receipts.id,
      seq: receipts.seq,
      receiptDate: receipts.receiptDate,
      status: receipts.status,
      totalSum: receipts.totalSum,
      comment: receipts.comment,
      counterpartyId: receipts.counterpartyId,
      supplierName: counterparties.name,
      warehouseId: receipts.warehouseId,
      warehouseName: warehouses.name,
      receivedAt: receipts.receivedAt,
    })
    .from(receipts)
    .innerJoin(counterparties, eq(counterparties.id, receipts.counterpartyId))
    .leftJoin(warehouses, eq(warehouses.id, receipts.warehouseId))
    .where(eq(receipts.id, id))
    .limit(1);
  return row ?? null;
}

export async function getItems(receiptId: string) {
  const db = getDb();
  return db
    .select({
      id: receiptItems.id,
      productId: receiptItems.productId,
      qty: receiptItems.qty,
      price: receiptItems.price,
      amount: receiptItems.amount,
      productName: products.name,
      sku: products.sku,
      unit: products.unit,
    })
    .from(receiptItems)
    .innerJoin(products, eq(products.id, receiptItems.productId))
    .where(eq(receiptItems.receiptId, receiptId));
}

export async function createReceipt(
  header: ReceiptHeader,
  items: ReceiptItemRow[]
) {
  const db = getDb();
  const [rec] = await db
    .insert(receipts)
    .values({
      receiptDate: header.receiptDate,
      counterpartyId: header.counterpartyId,
      warehouseId: header.warehouseId,
      status: header.status ?? "Новый",
      comment: header.comment,
      totalSum: header.totalSum,
    })
    .returning();
  if (items.length) {
    await db
      .insert(receiptItems)
      .values(items.map((it) => ({ ...it, receiptId: rec.id })));
  }
  return rec;
}

export async function replaceItems(receiptId: string, items: ReceiptItemRow[]) {
  const db = getDb();
  await db.delete(receiptItems).where(eq(receiptItems.receiptId, receiptId));
  if (items.length) {
    await db
      .insert(receiptItems)
      .values(items.map((it) => ({ ...it, receiptId })));
  }
}

export async function updateHeader(
  id: string,
  patch: Partial<ReceiptHeader> & {
    updatedAt?: Date;
    isActive?: boolean;
    receivedAt?: Date | null;
  }
) {
  const db = getDb();
  const values: Record<string, unknown> = { updatedAt: new Date() };
  for (const [k, v] of Object.entries(patch)) {
    if (v !== undefined) values[k] = v;
  }
  const [row] = await db
    .update(receipts)
    .set(values)
    .where(eq(receipts.id, id))
    .returning();
  return row ?? null;
}

export async function findById(id: string) {
  const db = getDb();
  const [row] = await db
    .select()
    .from(receipts)
    .where(eq(receipts.id, id))
    .limit(1);
  return row ?? null;
}

export async function archive(id: string) {
  return updateHeader(id, { isActive: false });
}
