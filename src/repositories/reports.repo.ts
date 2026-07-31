import { and, asc, eq, ilike, or, sql } from "drizzle-orm";
import { getDb } from "@/lib/db";
import { products, stockBalances } from "@/db/schema";

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
