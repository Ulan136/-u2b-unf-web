import { and, desc, eq, ilike, isNull, or, sql } from "drizzle-orm";
import { getDb } from "@/lib/db";
import { products, stockBalances, warehouses } from "@/db/schema";

export type NewProduct = {
  sku: string;
  name: string;
  fullName?: string;
  oralName?: string;
  name1c?: string;
  groupId?: string;
  unit?: "шт" | "кг" | "м" | "м2" | "м3" | "л" | "компл" | "уп";
  barcode?: string;
  minStock?: string;
  price?: string;
  costPrice?: string;
  ukanNomenId?: string;
  note?: string;
};

/**
 * Список номенклатуры с остатками.
 * - q задан → поиск по всем товарам (группа игнорируется).
 * - group задан → фильтр по группе (groupId=null → корень справочника).
 * - оба не заданы → ВСЕ товары (для доски склада).
 */
export async function listProducts(
  q?: string,
  group?: { groupId: string | null }
) {
  const db = getDb();

  let where;
  if (q) {
    where = or(
      ilike(products.name, `%${q}%`),
      ilike(products.sku, `%${q}%`),
      ilike(products.oralName, `%${q}%`),
      ilike(products.name1c, `%${q}%`)
    );
  } else if (group) {
    where = group.groupId
      ? eq(products.groupId, group.groupId)
      : isNull(products.groupId);
  }

  const rows = await db
    .select({
      id: products.id,
      sku: products.sku,
      name: products.name,
      oralName: products.oralName,
      name1c: products.name1c,
      groupId: products.groupId,
      unit: products.unit,
      price: products.price,
      costPrice: products.costPrice,
      minStock: products.minStock,
      isActive: products.isActive,
      ukanNomenId: products.ukanNomenId,
      qty: sql<string>`coalesce(sum(${stockBalances.qty}), 0)`.as("qty"),
      reserved: sql<string>`coalesce(sum(${stockBalances.reserved}), 0)`.as(
        "reserved"
      ),
    })
    .from(products)
    .leftJoin(stockBalances, eq(stockBalances.productId, products.id))
    .where(where)
    .groupBy(products.id)
    .orderBy(desc(products.updatedAt))
    .limit(500);

  return rows;
}

export async function createProduct(input: NewProduct) {
  const db = getDb();
  const [row] = await db
    .insert(products)
    .values({
      sku: input.sku.trim(),
      name: input.name.trim(),
      fullName: input.fullName,
      oralName: input.oralName,
      name1c: input.name1c,
      groupId: input.groupId,
      unit: input.unit ?? "шт",
      barcode: input.barcode,
      minStock: input.minStock ?? "0",
      price: input.price ?? "0",
      costPrice: input.costPrice ?? "0",
      ukanNomenId: input.ukanNomenId,
      note: input.note,
    })
    .returning();

  // Нулевой остаток на складе по умолчанию
  const [wh] = await db
    .select()
    .from(warehouses)
    .where(eq(warehouses.isDefault, true))
    .limit(1);

  if (wh && row) {
    await db.insert(stockBalances).values({
      productId: row.id,
      warehouseId: wh.id,
      qty: "0",
      reserved: "0",
    });
  }

  return row;
}

export async function ensureDefaultWarehouse() {
  const db = getDb();
  const existing = await db.select().from(warehouses).limit(1);
  if (existing.length) return existing[0];

  const [wh] = await db
    .insert(warehouses)
    .values({
      code: "MAIN",
      name: "Основной склад",
      isDefault: true,
      isActive: true,
    })
    .returning();
  return wh;
}
