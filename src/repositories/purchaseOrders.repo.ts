import { desc, eq } from "drizzle-orm";
import { getDb } from "@/lib/db";
import {
  counterparties,
  purchaseOrders,
  purchaseOrderItems,
  products,
  warehouses,
} from "@/db/schema";

/** ТОЛЬКО запросы Drizzle по документу «Заказ поставщику». */

export type PoHeader = {
  orderDate?: Date;
  counterpartyId: string;
  warehouseId?: string | null;
  status?: "Новый" | "В работе" | "Выполнен" | "Отменён";
  comment?: string | null;
  totalSum: string;
};

export type PoItemRow = {
  productId: string;
  qty: string;
  price: string;
  amount: string;
};

export async function listOrders() {
  const db = getDb();
  return db
    .select({
      id: purchaseOrders.id,
      seq: purchaseOrders.seq,
      orderDate: purchaseOrders.orderDate,
      status: purchaseOrders.status,
      totalSum: purchaseOrders.totalSum,
      counterpartyId: purchaseOrders.counterpartyId,
      supplierName: counterparties.name,
    })
    .from(purchaseOrders)
    .innerJoin(
      counterparties,
      eq(counterparties.id, purchaseOrders.counterpartyId)
    )
    .where(eq(purchaseOrders.isActive, true))
    .orderBy(desc(purchaseOrders.seq))
    .limit(500);
}

export async function getById(id: string) {
  const db = getDb();
  const [row] = await db
    .select({
      id: purchaseOrders.id,
      seq: purchaseOrders.seq,
      orderDate: purchaseOrders.orderDate,
      status: purchaseOrders.status,
      totalSum: purchaseOrders.totalSum,
      comment: purchaseOrders.comment,
      counterpartyId: purchaseOrders.counterpartyId,
      supplierName: counterparties.name,
      warehouseId: purchaseOrders.warehouseId,
      warehouseName: warehouses.name,
    })
    .from(purchaseOrders)
    .innerJoin(
      counterparties,
      eq(counterparties.id, purchaseOrders.counterpartyId)
    )
    .leftJoin(warehouses, eq(warehouses.id, purchaseOrders.warehouseId))
    .where(eq(purchaseOrders.id, id))
    .limit(1);
  return row ?? null;
}

export async function getItems(orderId: string) {
  const db = getDb();
  return db
    .select({
      id: purchaseOrderItems.id,
      productId: purchaseOrderItems.productId,
      qty: purchaseOrderItems.qty,
      price: purchaseOrderItems.price,
      amount: purchaseOrderItems.amount,
      productName: products.name,
      sku: products.sku,
      unit: products.unit,
    })
    .from(purchaseOrderItems)
    .innerJoin(products, eq(products.id, purchaseOrderItems.productId))
    .where(eq(purchaseOrderItems.orderId, orderId));
}

export async function createOrder(header: PoHeader, items: PoItemRow[]) {
  const db = getDb();
  const [order] = await db
    .insert(purchaseOrders)
    .values({
      orderDate: header.orderDate,
      counterpartyId: header.counterpartyId,
      warehouseId: header.warehouseId,
      status: header.status ?? "Новый",
      comment: header.comment,
      totalSum: header.totalSum,
    })
    .returning();
  if (items.length) {
    await db
      .insert(purchaseOrderItems)
      .values(items.map((it) => ({ ...it, orderId: order.id })));
  }
  return order;
}

export async function replaceItems(orderId: string, items: PoItemRow[]) {
  const db = getDb();
  await db
    .delete(purchaseOrderItems)
    .where(eq(purchaseOrderItems.orderId, orderId));
  if (items.length) {
    await db
      .insert(purchaseOrderItems)
      .values(items.map((it) => ({ ...it, orderId })));
  }
}

export async function updateHeader(
  id: string,
  patch: Partial<PoHeader> & { updatedAt?: Date; isActive?: boolean }
) {
  const db = getDb();
  const values: Record<string, unknown> = { updatedAt: new Date() };
  for (const [k, v] of Object.entries(patch)) {
    if (v !== undefined) values[k] = v;
  }
  const [row] = await db
    .update(purchaseOrders)
    .set(values)
    .where(eq(purchaseOrders.id, id))
    .returning();
  return row ?? null;
}

export async function findById(id: string) {
  const db = getDb();
  const [row] = await db
    .select()
    .from(purchaseOrders)
    .where(eq(purchaseOrders.id, id))
    .limit(1);
  return row ?? null;
}

export async function archive(id: string) {
  return updateHeader(id, { isActive: false });
}
