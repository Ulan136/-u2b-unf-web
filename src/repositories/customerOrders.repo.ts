import { desc, eq } from "drizzle-orm";
import { getDb } from "@/lib/db";
import {
  counterparties,
  customerOrders,
  customerOrderItems,
  products,
  warehouses,
} from "@/db/schema";

/** ТОЛЬКО запросы Drizzle по документу «Заказ покупателя». */

export type OrderHeader = {
  orderDate?: Date;
  counterpartyId: string;
  warehouseId?: string | null;
  status?: "Новый" | "В работе" | "Выполнен" | "Отменён";
  comment?: string | null;
  totalSum: string;
};

export type OrderItemRow = {
  productId: string;
  qty: string;
  price: string;
  amount: string;
};

export async function listOrders() {
  const db = getDb();
  return db
    .select({
      id: customerOrders.id,
      seq: customerOrders.seq,
      orderDate: customerOrders.orderDate,
      status: customerOrders.status,
      totalSum: customerOrders.totalSum,
      comment: customerOrders.comment,
      counterpartyId: customerOrders.counterpartyId,
      customerName: counterparties.name,
    })
    .from(customerOrders)
    .innerJoin(
      counterparties,
      eq(counterparties.id, customerOrders.counterpartyId)
    )
    .where(eq(customerOrders.isActive, true))
    .orderBy(desc(customerOrders.seq))
    .limit(500);
}

export async function getById(id: string) {
  const db = getDb();
  const [row] = await db
    .select({
      id: customerOrders.id,
      seq: customerOrders.seq,
      orderDate: customerOrders.orderDate,
      status: customerOrders.status,
      totalSum: customerOrders.totalSum,
      comment: customerOrders.comment,
      counterpartyId: customerOrders.counterpartyId,
      customerName: counterparties.name,
      warehouseId: customerOrders.warehouseId,
      warehouseName: warehouses.name,
    })
    .from(customerOrders)
    .innerJoin(
      counterparties,
      eq(counterparties.id, customerOrders.counterpartyId)
    )
    .leftJoin(warehouses, eq(warehouses.id, customerOrders.warehouseId))
    .where(eq(customerOrders.id, id))
    .limit(1);
  return row ?? null;
}

export async function getItems(orderId: string) {
  const db = getDb();
  return db
    .select({
      id: customerOrderItems.id,
      productId: customerOrderItems.productId,
      qty: customerOrderItems.qty,
      price: customerOrderItems.price,
      amount: customerOrderItems.amount,
      productName: products.name,
      sku: products.sku,
      unit: products.unit,
    })
    .from(customerOrderItems)
    .innerJoin(products, eq(products.id, customerOrderItems.productId))
    .where(eq(customerOrderItems.orderId, orderId));
}

export async function createOrder(header: OrderHeader, items: OrderItemRow[]) {
  const db = getDb();
  const [order] = await db
    .insert(customerOrders)
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
      .insert(customerOrderItems)
      .values(items.map((it) => ({ ...it, orderId: order.id })));
  }
  return order;
}

export async function replaceItems(orderId: string, items: OrderItemRow[]) {
  const db = getDb();
  await db
    .delete(customerOrderItems)
    .where(eq(customerOrderItems.orderId, orderId));
  if (items.length) {
    await db
      .insert(customerOrderItems)
      .values(items.map((it) => ({ ...it, orderId })));
  }
}

export async function updateHeader(
  id: string,
  patch: Partial<OrderHeader> & { updatedAt?: Date; isActive?: boolean }
) {
  const db = getDb();
  const values: Record<string, unknown> = { updatedAt: new Date() };
  for (const [k, v] of Object.entries(patch)) {
    if (v !== undefined) values[k] = v;
  }
  const [row] = await db
    .update(customerOrders)
    .set(values)
    .where(eq(customerOrders.id, id))
    .returning();
  return row ?? null;
}

export async function findById(id: string) {
  const db = getDb();
  const [row] = await db
    .select()
    .from(customerOrders)
    .where(eq(customerOrders.id, id))
    .limit(1);
  return row ?? null;
}

export async function archive(id: string) {
  return updateHeader(id, { isActive: false });
}
