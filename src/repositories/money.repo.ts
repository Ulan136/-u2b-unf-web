import { and, desc, eq, gte, lt, ne, sql } from "drizzle-orm";
import { getDb } from "@/lib/db";
import { counterparties, moneyAccounts, moneyOperations } from "@/db/schema";

/** ТОЛЬКО запросы Drizzle по деньгам (счета/кассы и операции). */

export type NewAccount = {
  name: string;
  kind?: "Касса" | "Банк";
  isDefault?: boolean;
};

export type NewOperation = {
  kind: "Приход" | "Расход";
  accountId: string;
  counterpartyId?: string | null;
  amount: string;
  opDate?: Date;
  comment?: string | null;
  sourceType?: string | null;
  sourceId?: string | null;
};

// Баланс счёта = сумма приходов минус сумма расходов (через leftJoin+groupBy).
const balanceSql = sql<string>`coalesce(sum(case
  when ${moneyOperations.kind} = 'Приход' then ${moneyOperations.amount}
  else -${moneyOperations.amount} end), 0)`;

export async function listAccounts(includeArchived = false) {
  const db = getDb();
  return db
    .select({
      id: moneyAccounts.id,
      name: moneyAccounts.name,
      kind: moneyAccounts.kind,
      isDefault: moneyAccounts.isDefault,
      isActive: moneyAccounts.isActive,
      balance: balanceSql.as("balance"),
    })
    .from(moneyAccounts)
    .leftJoin(moneyOperations, eq(moneyOperations.accountId, moneyAccounts.id))
    .where(includeArchived ? undefined : eq(moneyAccounts.isActive, true))
    .groupBy(moneyAccounts.id)
    .orderBy(desc(moneyAccounts.isDefault), moneyAccounts.name);
}

export async function findAccount(id: string) {
  const db = getDb();
  const [row] = await db
    .select()
    .from(moneyAccounts)
    .where(eq(moneyAccounts.id, id))
    .limit(1);
  return row ?? null;
}

export async function unsetOtherDefaults(exceptId?: string) {
  const db = getDb();
  await db
    .update(moneyAccounts)
    .set({ isDefault: false })
    .where(exceptId ? ne(moneyAccounts.id, exceptId) : undefined);
}

export async function createAccount(input: NewAccount) {
  const db = getDb();
  const [row] = await db
    .insert(moneyAccounts)
    .values({
      name: input.name.trim(),
      kind: input.kind ?? "Касса",
      isDefault: input.isDefault ?? false,
      isActive: true,
    })
    .returning();
  return row;
}

export async function updateAccount(
  id: string,
  patch: Partial<NewAccount> & { isActive?: boolean }
) {
  const db = getDb();
  const values: Record<string, unknown> = {};
  for (const [k, v] of Object.entries(patch)) {
    if (v !== undefined) values[k] = v;
  }
  const [row] = await db
    .update(moneyAccounts)
    .set(values)
    .where(eq(moneyAccounts.id, id))
    .returning();
  return row ?? null;
}

export async function archiveAccount(id: string) {
  return updateAccount(id, { isActive: false, isDefault: false });
}

// ── Операции ────────────────────────────────────────────
export async function listOperations(opts: {
  accountId?: string;
  from?: Date;
  to?: Date;
  limit?: number;
}) {
  const db = getDb();
  const conds = [];
  if (opts.accountId) conds.push(eq(moneyOperations.accountId, opts.accountId));
  if (opts.from) conds.push(gte(moneyOperations.opDate, opts.from));
  if (opts.to) conds.push(lt(moneyOperations.opDate, opts.to));

  return db
    .select({
      id: moneyOperations.id,
      seq: moneyOperations.seq,
      opDate: moneyOperations.opDate,
      kind: moneyOperations.kind,
      amount: moneyOperations.amount,
      comment: moneyOperations.comment,
      accountId: moneyOperations.accountId,
      accountName: moneyAccounts.name,
      counterpartyId: moneyOperations.counterpartyId,
      counterpartyName: counterparties.name,
    })
    .from(moneyOperations)
    .innerJoin(moneyAccounts, eq(moneyAccounts.id, moneyOperations.accountId))
    .leftJoin(
      counterparties,
      eq(counterparties.id, moneyOperations.counterpartyId)
    )
    .where(conds.length ? and(...conds) : undefined)
    .orderBy(desc(moneyOperations.opDate), desc(moneyOperations.seq))
    .limit(opts.limit ?? 100);
}

export async function createOperation(input: NewOperation) {
  const db = getDb();
  const [row] = await db
    .insert(moneyOperations)
    .values({
      kind: input.kind,
      accountId: input.accountId,
      counterpartyId: input.counterpartyId ?? null,
      amount: input.amount,
      opDate: input.opDate,
      comment: input.comment,
      sourceType: input.sourceType ?? null,
      sourceId: input.sourceId ?? null,
    })
    .returning();
  return row;
}

/** Сумма оплат, привязанных к документу (для «оплачено X из суммы»). */
export async function sumPaidBySource(sourceType: string, sourceId: string) {
  const db = getDb();
  const [row] = await db
    .select({ sum: sql<string>`coalesce(sum(${moneyOperations.amount}), 0)` })
    .from(moneyOperations)
    .where(
      and(
        eq(moneyOperations.sourceType, sourceType),
        eq(moneyOperations.sourceId, sourceId)
      )
    );
  return Number(row?.sum ?? 0);
}
