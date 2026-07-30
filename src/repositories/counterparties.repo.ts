import { and, asc, desc, eq, ilike, isNull, or } from "drizzle-orm";
import { getDb } from "@/lib/db";
import { counterparties, counterpartyGroups } from "@/db/schema";

/** ТОЛЬКО запросы Drizzle по контрагентам и их группам. */

export type NewCounterparty = {
  code?: string;
  name: string;
  fullName?: string | null;
  legalType?: string;
  bin?: string | null;
  isCustomer?: boolean;
  isSupplier?: boolean;
  groupId?: string | null;
  phone?: string | null;
  email?: string | null;
  address?: string | null;
  contactPerson?: string | null;
  comment?: string | null;
};

export type CounterpartyPatch = Partial<NewCounterparty> & { isActive?: boolean };

// ── Группы ──────────────────────────────────────────────
export async function listGroups(parentId: string | null) {
  const db = getDb();
  return db
    .select()
    .from(counterpartyGroups)
    .where(
      and(
        eq(counterpartyGroups.isActive, true),
        parentId
          ? eq(counterpartyGroups.parentId, parentId)
          : isNull(counterpartyGroups.parentId)
      )
    )
    .orderBy(asc(counterpartyGroups.name));
}

export async function createGroup(input: {
  name: string;
  parentId?: string | null;
  code?: string;
}) {
  const db = getDb();
  const [row] = await db
    .insert(counterpartyGroups)
    .values({
      name: input.name.trim(),
      parentId: input.parentId ?? null,
      code: input.code,
    })
    .returning();
  return row;
}

// ── Контрагенты ─────────────────────────────────────────
export async function listCounterparties(
  q?: string,
  group?: { groupId: string | null }
) {
  const db = getDb();
  const conds = [eq(counterparties.isActive, true)];
  if (q) {
    conds.push(
      or(
        ilike(counterparties.name, `%${q}%`),
        ilike(counterparties.fullName, `%${q}%`),
        ilike(counterparties.bin, `%${q}%`),
        ilike(counterparties.phone, `%${q}%`)
      )!
    );
  } else if (group) {
    conds.push(
      group.groupId
        ? eq(counterparties.groupId, group.groupId)
        : isNull(counterparties.groupId)
    );
  }
  return db
    .select()
    .from(counterparties)
    .where(and(...conds))
    .orderBy(desc(counterparties.updatedAt))
    .limit(500);
}

export async function findById(id: string) {
  const db = getDb();
  const [row] = await db
    .select()
    .from(counterparties)
    .where(eq(counterparties.id, id))
    .limit(1);
  return row ?? null;
}

export async function createCounterparty(input: NewCounterparty) {
  const db = getDb();
  const [row] = await db
    .insert(counterparties)
    .values({
      code: input.code,
      name: input.name.trim(),
      fullName: input.fullName,
      legalType: input.legalType ?? "Юридическое",
      bin: input.bin,
      isCustomer: input.isCustomer ?? false,
      isSupplier: input.isSupplier ?? false,
      groupId: input.groupId,
      phone: input.phone,
      email: input.email,
      address: input.address,
      contactPerson: input.contactPerson,
      comment: input.comment,
    })
    .returning();
  return row;
}

export async function updateCounterparty(id: string, patch: CounterpartyPatch) {
  const db = getDb();
  const values: Record<string, unknown> = { updatedAt: new Date() };
  for (const [k, v] of Object.entries(patch)) {
    if (v !== undefined) values[k] = v;
  }
  const [row] = await db
    .update(counterparties)
    .set(values)
    .where(eq(counterparties.id, id))
    .returning();
  return row ?? null;
}

export async function archiveCounterparty(id: string) {
  return updateCounterparty(id, { isActive: false });
}
