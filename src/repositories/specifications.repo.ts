import { and, desc, eq, sql } from "drizzle-orm";
import { getDb } from "@/lib/db";
import { products, specifications, specificationItems } from "@/db/schema";

/** ТОЛЬКО запросы Drizzle по справочнику «Спецификации». */

export type SpecHeader = {
  productId: string;
  name?: string;
  outputQty?: string;
};

export type SpecItemRow = { materialProductId: string; qty: string };

export async function listSpecs() {
  const db = getDb();
  return db
    .select({
      id: specifications.id,
      name: specifications.name,
      outputQty: specifications.outputQty,
      productId: specifications.productId,
      productName: products.name,
      productSku: products.sku,
      itemsCount: sql<number>`count(${specificationItems.id})::int`,
    })
    .from(specifications)
    .innerJoin(products, eq(products.id, specifications.productId))
    .leftJoin(
      specificationItems,
      eq(specificationItems.specId, specifications.id)
    )
    .where(eq(specifications.isActive, true))
    .groupBy(specifications.id, products.name, products.sku)
    .orderBy(desc(specifications.createdAt))
    .limit(500);
}

export async function getById(id: string) {
  const db = getDb();
  const [row] = await db
    .select({
      id: specifications.id,
      name: specifications.name,
      outputQty: specifications.outputQty,
      productId: specifications.productId,
      productName: products.name,
      productSku: products.sku,
      productUnit: products.unit,
    })
    .from(specifications)
    .innerJoin(products, eq(products.id, specifications.productId))
    .where(eq(specifications.id, id))
    .limit(1);
  return row ?? null;
}

export async function getItems(specId: string) {
  const db = getDb();
  return db
    .select({
      id: specificationItems.id,
      materialProductId: specificationItems.materialProductId,
      qty: specificationItems.qty,
      materialName: products.name,
      sku: products.sku,
      unit: products.unit,
    })
    .from(specificationItems)
    .innerJoin(products, eq(products.id, specificationItems.materialProductId))
    .where(eq(specificationItems.specId, specId));
}

export async function createSpec(header: SpecHeader, items: SpecItemRow[]) {
  const db = getDb();
  const [spec] = await db
    .insert(specifications)
    .values({
      productId: header.productId,
      name: header.name ?? "Основная",
      outputQty: header.outputQty ?? "1",
    })
    .returning();
  if (items.length) {
    await db
      .insert(specificationItems)
      .values(items.map((it) => ({ ...it, specId: spec.id })));
  }
  return spec;
}

export async function replaceItems(specId: string, items: SpecItemRow[]) {
  const db = getDb();
  await db
    .delete(specificationItems)
    .where(eq(specificationItems.specId, specId));
  if (items.length) {
    await db
      .insert(specificationItems)
      .values(items.map((it) => ({ ...it, specId })));
  }
}

export async function updateHeader(
  id: string,
  patch: Partial<SpecHeader> & { isActive?: boolean }
) {
  const db = getDb();
  const values: Record<string, unknown> = { updatedAt: new Date() };
  for (const [k, v] of Object.entries(patch)) {
    if (v !== undefined) values[k] = v;
  }
  const [row] = await db
    .update(specifications)
    .set(values)
    .where(eq(specifications.id, id))
    .returning();
  return row ?? null;
}

export async function findById(id: string) {
  const db = getDb();
  const [row] = await db
    .select()
    .from(specifications)
    .where(eq(specifications.id, id))
    .limit(1);
  return row ?? null;
}

export async function archive(id: string) {
  return updateHeader(id, { isActive: false });
}
