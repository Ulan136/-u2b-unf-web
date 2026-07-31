import { desc, eq } from "drizzle-orm";
import { getDb } from "@/lib/db";
import { products, productions, productionItems, warehouses } from "@/db/schema";

/** ТОЛЬКО запросы Drizzle по документу «Производство». */

export type ProdHeader = {
  prodDate?: Date;
  productId: string;
  specId?: string | null;
  qty: string;
  warehouseId?: string | null;
  status?: "Новый" | "В работе" | "Выполнен" | "Отменён";
  comment?: string | null;
};

export type ProdItemRow = { materialProductId: string; qty: string };

export async function listProductions() {
  const db = getDb();
  return db
    .select({
      id: productions.id,
      seq: productions.seq,
      prodDate: productions.prodDate,
      status: productions.status,
      qty: productions.qty,
      cost: productions.cost,
      producedAt: productions.producedAt,
      productId: productions.productId,
      productName: products.name,
    })
    .from(productions)
    .innerJoin(products, eq(products.id, productions.productId))
    .where(eq(productions.isActive, true))
    .orderBy(desc(productions.seq))
    .limit(500);
}

export async function getById(id: string) {
  const db = getDb();
  const [row] = await db
    .select({
      id: productions.id,
      seq: productions.seq,
      prodDate: productions.prodDate,
      status: productions.status,
      qty: productions.qty,
      cost: productions.cost,
      comment: productions.comment,
      producedAt: productions.producedAt,
      productId: productions.productId,
      productName: products.name,
      productSku: products.sku,
      productUnit: products.unit,
      specId: productions.specId,
      warehouseId: productions.warehouseId,
      warehouseName: warehouses.name,
    })
    .from(productions)
    .innerJoin(products, eq(products.id, productions.productId))
    .leftJoin(warehouses, eq(warehouses.id, productions.warehouseId))
    .where(eq(productions.id, id))
    .limit(1);
  return row ?? null;
}

export async function getItems(productionId: string) {
  const db = getDb();
  return db
    .select({
      id: productionItems.id,
      materialProductId: productionItems.materialProductId,
      qty: productionItems.qty,
      materialName: products.name,
      sku: products.sku,
      unit: products.unit,
      costPrice: products.costPrice,
    })
    .from(productionItems)
    .innerJoin(products, eq(products.id, productionItems.materialProductId))
    .where(eq(productionItems.productionId, productionId));
}

export async function createProduction(header: ProdHeader, items: ProdItemRow[]) {
  const db = getDb();
  const [prod] = await db
    .insert(productions)
    .values({
      prodDate: header.prodDate,
      productId: header.productId,
      specId: header.specId,
      qty: header.qty,
      warehouseId: header.warehouseId,
      status: header.status ?? "Новый",
    })
    .returning();
  if (items.length) {
    await db
      .insert(productionItems)
      .values(items.map((it) => ({ ...it, productionId: prod.id })));
  }
  return prod;
}

export async function replaceItems(productionId: string, items: ProdItemRow[]) {
  const db = getDb();
  await db
    .delete(productionItems)
    .where(eq(productionItems.productionId, productionId));
  if (items.length) {
    await db
      .insert(productionItems)
      .values(items.map((it) => ({ ...it, productionId })));
  }
}

export async function updateHeader(
  id: string,
  patch: Partial<ProdHeader> & {
    updatedAt?: Date;
    isActive?: boolean;
    producedAt?: Date | null;
    cost?: string;
  }
) {
  const db = getDb();
  const values: Record<string, unknown> = { updatedAt: new Date() };
  for (const [k, v] of Object.entries(patch)) {
    if (v !== undefined) values[k] = v;
  }
  const [row] = await db
    .update(productions)
    .set(values)
    .where(eq(productions.id, id))
    .returning();
  return row ?? null;
}

export async function findById(id: string) {
  const db = getDb();
  const [row] = await db
    .select()
    .from(productions)
    .where(eq(productions.id, id))
    .limit(1);
  return row ?? null;
}

export async function archive(id: string) {
  return updateHeader(id, { isActive: false });
}
