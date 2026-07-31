import { asc, eq, ne } from "drizzle-orm";
import { getDb } from "@/lib/db";
import { organizations } from "@/db/schema";

/** ТОЛЬКО запросы Drizzle по справочнику «Организации». */

export type NewOrganization = {
  name: string;
  fullName?: string | null;
  bin?: string | null;
  address?: string | null;
  phone?: string | null;
  email?: string | null;
  director?: string | null;
  bankName?: string | null;
  bankAccount?: string | null;
  bankBik?: string | null;
  isDefault?: boolean;
};
export type OrganizationPatch = Partial<NewOrganization> & { isActive?: boolean };

export async function listOrganizations(includeArchived = false) {
  const db = getDb();
  if (includeArchived) {
    return db.select().from(organizations).orderBy(asc(organizations.name));
  }
  return db
    .select()
    .from(organizations)
    .where(eq(organizations.isActive, true))
    .orderBy(asc(organizations.name));
}

export async function findById(id: string) {
  const db = getDb();
  const [row] = await db
    .select()
    .from(organizations)
    .where(eq(organizations.id, id))
    .limit(1);
  return row ?? null;
}

export async function unsetOtherDefaults(exceptId?: string) {
  const db = getDb();
  await db
    .update(organizations)
    .set({ isDefault: false })
    .where(exceptId ? ne(organizations.id, exceptId) : undefined);
}

export async function createOrganization(input: NewOrganization) {
  const db = getDb();
  const [row] = await db
    .insert(organizations)
    .values({ ...input, name: input.name.trim(), isActive: true })
    .returning();
  return row;
}

export async function updateOrganization(id: string, patch: OrganizationPatch) {
  const db = getDb();
  const values: Record<string, unknown> = { updatedAt: new Date() };
  for (const [k, v] of Object.entries(patch)) {
    if (v !== undefined) values[k] = v;
  }
  const [row] = await db
    .update(organizations)
    .set(values)
    .where(eq(organizations.id, id))
    .returning();
  return row ?? null;
}

export async function archiveOrganization(id: string) {
  return updateOrganization(id, { isActive: false, isDefault: false });
}
