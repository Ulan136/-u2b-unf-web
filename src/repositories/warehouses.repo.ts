import { asc, eq, ne } from "drizzle-orm";
import { getDb } from "@/lib/db";
import { warehouses } from "@/db/schema";

/** ТОЛЬКО запросы Drizzle по складам. */

export type NewWarehouse = {
  code: string;
  name: string;
  address?: string | null;
  isDefault?: boolean;
};
export type WarehousePatch = Partial<NewWarehouse> & { isActive?: boolean };

export async function listWarehouses(includeArchived = false) {
  const db = getDb();
  if (includeArchived) {
    return db.select().from(warehouses).orderBy(asc(warehouses.name));
  }
  return db
    .select()
    .from(warehouses)
    .where(eq(warehouses.isActive, true))
    .orderBy(asc(warehouses.name));
}

export async function findById(id: string) {
  const db = getDb();
  const [row] = await db
    .select()
    .from(warehouses)
    .where(eq(warehouses.id, id))
    .limit(1);
  return row ?? null;
}

/** Снять признак «основной» со всех остальных складов. */
export async function unsetOtherDefaults(exceptId?: string) {
  const db = getDb();
  await db
    .update(warehouses)
    .set({ isDefault: false })
    .where(exceptId ? ne(warehouses.id, exceptId) : undefined);
}

export async function createWarehouse(input: NewWarehouse) {
  const db = getDb();
  const [row] = await db
    .insert(warehouses)
    .values({
      code: input.code.trim(),
      name: input.name.trim(),
      address: input.address,
      isDefault: input.isDefault ?? false,
      isActive: true,
    })
    .returning();
  return row;
}

export async function updateWarehouse(id: string, patch: WarehousePatch) {
  const db = getDb();
  const values: Record<string, unknown> = {};
  for (const [k, v] of Object.entries(patch)) {
    if (v !== undefined) values[k] = v;
  }
  const [row] = await db
    .update(warehouses)
    .set(values)
    .where(eq(warehouses.id, id))
    .returning();
  return row ?? null;
}

export async function archiveWarehouse(id: string) {
  return updateWarehouse(id, { isActive: false, isDefault: false });
}
