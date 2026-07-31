import { and, asc, desc, eq, gte, ilike, isNotNull, lt, or, sql } from "drizzle-orm";
import { getDb } from "@/lib/db";
import {
  customerOrderItems,
  customerOrders,
  moneyOperations,
  products,
  receipts,
  receiptItems,
  stockBalances,
} from "@/db/schema";

/** ТОЛЬКО запросы Drizzle для отчётов. */

/**
 * Остатки товаров: сумма по складам (или по одному складу, если задан warehouseId).
 * Возвращает все активные товары (в т.ч. с нулём) — фильтрацию делает сервис.
 */
export async function stockReport(opts: { warehouseId?: string; q?: string }) {
  const db = getDb();

  const conds = [eq(products.isActive, true)];
  if (opts.q && opts.q.trim()) {
    const like = `%${opts.q.trim()}%`;
    conds.push(
      or(ilike(products.name, like), ilike(products.sku, like))!
    );
  }

  const joinCond = opts.warehouseId
    ? and(
        eq(stockBalances.productId, products.id),
        eq(stockBalances.warehouseId, opts.warehouseId)
      )
    : eq(stockBalances.productId, products.id);

  return db
    .select({
      productId: products.id,
      sku: products.sku,
      name: products.name,
      unit: products.unit,
      costPrice: products.costPrice,
      price: products.price,
      qty: sql<string>`coalesce(sum(${stockBalances.qty}), 0)`,
      reserved: sql<string>`coalesce(sum(${stockBalances.reserved}), 0)`,
    })
    .from(products)
    .leftJoin(stockBalances, joinCond)
    .where(and(...conds))
    .groupBy(products.id)
    .orderBy(asc(products.name));
}

/**
 * Продажи за период: по отгруженным заказам (shipped_at в диапазоне [from, to)).
 * Агрегат по товарам: сколько продано и на какую сумму.
 */
export async function salesReport(opts: { from: Date; to: Date }) {
  const db = getDb();
  return db
    .select({
      productId: products.id,
      sku: products.sku,
      name: products.name,
      unit: products.unit,
      qty: sql<string>`coalesce(sum(${customerOrderItems.qty}), 0)`,
      amount: sql<string>`coalesce(sum(${customerOrderItems.amount}), 0)`,
    })
    .from(customerOrderItems)
    .innerJoin(
      customerOrders,
      eq(customerOrders.id, customerOrderItems.orderId)
    )
    .innerJoin(products, eq(products.id, customerOrderItems.productId))
    .where(
      and(
        eq(customerOrders.isActive, true),
        isNotNull(customerOrders.shippedAt),
        gte(customerOrders.shippedAt, opts.from),
        lt(customerOrders.shippedAt, opts.to)
      )
    )
    .groupBy(products.id)
    .orderBy(desc(sql`sum(${customerOrderItems.amount})`));
}

/**
 * Прибыль за период: по отгруженным заказам. Выручка (сумма строк) и
 * себестоимость (кол-во × себестоимость товара) по каждому товару.
 */
export async function profitReport(opts: { from: Date; to: Date }) {
  const db = getDb();
  return db
    .select({
      productId: products.id,
      sku: products.sku,
      name: products.name,
      qty: sql<string>`coalesce(sum(${customerOrderItems.qty}), 0)`,
      revenue: sql<string>`coalesce(sum(${customerOrderItems.amount}), 0)`,
      cost: sql<string>`coalesce(sum(${customerOrderItems.qty} * ${products.costPrice}), 0)`,
    })
    .from(customerOrderItems)
    .innerJoin(
      customerOrders,
      eq(customerOrders.id, customerOrderItems.orderId)
    )
    .innerJoin(products, eq(products.id, customerOrderItems.productId))
    .where(
      and(
        eq(customerOrders.isActive, true),
        isNotNull(customerOrders.shippedAt),
        gte(customerOrders.shippedAt, opts.from),
        lt(customerOrders.shippedAt, opts.to)
      )
    )
    .groupBy(products.id)
    .orderBy(desc(sql`sum(${customerOrderItems.amount})`));
}

/** Приход/расход по счетам за период [from, to). */
export async function cashFlow(opts: { from: Date; to: Date }) {
  const db = getDb();
  return db
    .select({
      accountId: moneyOperations.accountId,
      income: sql<string>`coalesce(sum(case when ${moneyOperations.kind} = 'Приход' then ${moneyOperations.amount} else 0 end), 0)`,
      expense: sql<string>`coalesce(sum(case when ${moneyOperations.kind} = 'Расход' then ${moneyOperations.amount} else 0 end), 0)`,
    })
    .from(moneyOperations)
    .where(
      and(
        gte(moneyOperations.opDate, opts.from),
        lt(moneyOperations.opDate, opts.to)
      )
    )
    .groupBy(moneyOperations.accountId);
}

/** Входящие остатки по счетам на момент `before` (все операции до даты). */
export async function openingBalances(before: Date) {
  const db = getDb();
  return db
    .select({
      accountId: moneyOperations.accountId,
      opening: sql<string>`coalesce(sum(case when ${moneyOperations.kind} = 'Приход' then ${moneyOperations.amount} else -${moneyOperations.amount} end), 0)`,
    })
    .from(moneyOperations)
    .where(lt(moneyOperations.opDate, before))
    .groupBy(moneyOperations.accountId);
}

/**
 * Закупки за период: по оприходованным поступлениям (received_at в [from, to)).
 * Агрегат по товарам: сколько закуплено и на какую сумму.
 */
export async function purchaseReport(opts: { from: Date; to: Date }) {
  const db = getDb();
  return db
    .select({
      productId: products.id,
      sku: products.sku,
      name: products.name,
      unit: products.unit,
      qty: sql<string>`coalesce(sum(${receiptItems.qty}), 0)`,
      amount: sql<string>`coalesce(sum(${receiptItems.amount}), 0)`,
    })
    .from(receiptItems)
    .innerJoin(receipts, eq(receipts.id, receiptItems.receiptId))
    .innerJoin(products, eq(products.id, receiptItems.productId))
    .where(
      and(
        eq(receipts.isActive, true),
        isNotNull(receipts.receivedAt),
        gte(receipts.receivedAt, opts.from),
        lt(receipts.receivedAt, opts.to)
      )
    )
    .groupBy(products.id)
    .orderBy(desc(sql`sum(${receiptItems.amount})`));
}
