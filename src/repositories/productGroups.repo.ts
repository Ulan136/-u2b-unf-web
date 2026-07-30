import { and, asc, eq, isNull } from "drizzle-orm";
import { getDb } from "@/lib/db";
import { productGroups } from "@/db/schema";

/** ТОЛЬКО запросы Drizzle по группам номенклатуры (иерархия папок). */

export async function listGroups(parentId: string | null) {
  const db = getDb();
  return db
    .select()
    .from(productGroups)
    .where(
      and(
        eq(productGroups.isActive, true),
        parentId
          ? eq(productGroups.parentId, parentId)
          : isNull(productGroups.parentId)
      )
    )
    .orderBy(asc(productGroups.name));
}

export async function getGroup(id: string) {
  const db = getDb();
  const [row] = await db
    .select()
    .from(productGroups)
    .where(eq(productGroups.id, id))
    .limit(1);
  return row ?? null;
}

export async function createGroup(input: {
  name: string;
  parentId?: string | null;
  code?: string;
}) {
  const db = getDb();
  const [row] = await db
    .insert(productGroups)
    .values({
      name: input.name.trim(),
      parentId: input.parentId ?? null,
      code: input.code,
    })
    .returning();
  return row;
}
