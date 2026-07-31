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
  kind?: string;
  unit?: "шт" | "кг" | "м" | "м2" | "м3" | "л" | "компл" | "уп";
  barcode?: string;
  minStock?: string;
  price?: string;
  costPrice?: string;
  ukanNomenId?: string;
  note?: string;
};

export type ProductPatch = {
  sku?: string;
  name?: string;
  fullName?: string | null;
  oralName?: string | null;
  name1c?: string | null;
  groupId?: string | null;
  kind?: string;
  unit?: NewProduct["unit"];
  barcode?: string | null;
  minStock?: string | null;
  price?: string | null;
  costPrice?: string | null;
  ukanNomenId?: string | null;
  note?: string | null;
  isActive?: boolean;
};

/**
 * Список номенклатуры с остатками.
 * - q задан → поиск по всем товарам (группа игнорируется).
 * - group задан → фильтр по группе (groupId=null → корень справочника).
 * - оба не заданы → ВСЕ товары (для доски склада).
 */
export async function listProducts(
  q?: string,
  group?: { groupId: string | null },
  warehouseId?: string
) {
  const db = getDb();

  const conds = [eq(products.isActive, true)]; // архивные не показываем
  if (q) {
    conds.push(
      or(
        ilike(products.name, `%${q}%`),
        ilike(products.sku, `%${q}%`),
        ilike(products.oralName, `%${q}%`),
        ilike(products.name1c, `%${q}%`)
      )!
    );
  } else if (group) {
    conds.push(
      group.groupId
        ? eq(products.groupId, group.groupId)
        : isNull(products.groupId)
    );
  }
  const where = and(...conds);

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
    .leftJoin(
      stockBalances,
      warehouseId
        ? and(
            eq(stockBalances.productId, products.id),
            eq(stockBalances.warehouseId, warehouseId)
          )
        : eq(stockBalances.productId, products.id)
    )
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
      kind: input.kind ?? "Товар",
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

/** Один товар со суммарным остатком по всем складам. */
export async function findProductById(id: string) {
  const db = getDb();
  const [row] = await db
    .select({
      id: products.id,
      sku: products.sku,
      name: products.name,
      fullName: products.fullName,
      oralName: products.oralName,
      name1c: products.name1c,
      groupId: products.groupId,
      kind: products.kind,
      unit: products.unit,
      barcode: products.barcode,
      minStock: products.minStock,
      price: products.price,
      costPrice: products.costPrice,
      isActive: products.isActive,
      ukanNomenId: products.ukanNomenId,
      note: products.note,
      qty: sql<string>`coalesce((select sum(${stockBalances.qty}) from ${stockBalances} where ${stockBalances.productId} = ${products.id}), 0)`,
      reserved: sql<string>`coalesce((select sum(${stockBalances.reserved}) from ${stockBalances} where ${stockBalances.productId} = ${products.id}), 0)`,
    })
    .from(products)
    .where(eq(products.id, id))
    .limit(1);
  return row ?? null;
}

export async function updateProduct(id: string, patch: ProductPatch) {
  const db = getDb();
  const values: Record<string, unknown> = { updatedAt: new Date() };
  for (const [k, v] of Object.entries(patch)) {
    if (v !== undefined) values[k] = v;
  }
  const [row] = await db
    .update(products)
    .set(values)
    .where(eq(products.id, id))
    .returning();
  return row ?? null;
}

/** Пометка на удаление / архив (не теряем историю). */
export async function archiveProduct(id: string) {
  return updateProduct(id, { isActive: false });
}

/** Все артикулы (для проверки дублей при импорте). */
export async function getAllSkus() {
  const db = getDb();
  const rows = await db.select({ sku: products.sku }).from(products);
  return rows.map((r) => r.sku);
}

/** Массовое создание номенклатуры (импорт). Остатки не создаём — считаются как 0. */
export async function bulkCreateProducts(rows: NewProduct[]) {
  if (!rows.length) return 0;
  const db = getDb();
  const created = await db
    .insert(products)
    .values(
      rows.map((r) => ({
        sku: r.sku.trim(),
        name: r.name.trim(),
        kind: r.kind ?? "Товар",
        unit: r.unit ?? "шт",
        price: r.price ?? "0",
        costPrice: r.costPrice ?? "0",
        name1c: r.name1c,
      }))
    )
    .returning({ id: products.id });
  return created.length;
}
