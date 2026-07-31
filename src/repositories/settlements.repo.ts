import { and, eq, isNotNull, sql } from "drizzle-orm";
import { getDb } from "@/lib/db";
import {
  counterparties,
  customerOrders,
  moneyOperations,
  receipts,
} from "@/db/schema";

/** Агрегаты по контрагентам для взаиморасчётов. */

// Отгружено покупателям (по проведённым отгрузкам).
export async function salesByCounterparty() {
  const db = getDb();
  return db
    .select({
      counterpartyId: customerOrders.counterpartyId,
      name: counterparties.name,
      sum: sql<string>`coalesce(sum(${customerOrders.totalSum}), 0)`,
    })
    .from(customerOrders)
    .innerJoin(
      counterparties,
      eq(counterparties.id, customerOrders.counterpartyId)
    )
    .where(
      and(eq(customerOrders.isActive, true), isNotNull(customerOrders.shippedAt))
    )
    .groupBy(customerOrders.counterpartyId, counterparties.name);
}

// Оприходовано от поставщиков (по проведённым поступлениям).
export async function purchasesByCounterparty() {
  const db = getDb();
  return db
    .select({
      counterpartyId: receipts.counterpartyId,
      name: counterparties.name,
      sum: sql<string>`coalesce(sum(${receipts.totalSum}), 0)`,
    })
    .from(receipts)
    .innerJoin(counterparties, eq(counterparties.id, receipts.counterpartyId))
    .where(and(eq(receipts.isActive, true), isNotNull(receipts.receivedAt)))
    .groupBy(receipts.counterpartyId, counterparties.name);
}

// Деньги по контрагентам (Приход = оплатил нам, Расход = мы выплатили).
export async function moneyByCounterparty(kind: "Приход" | "Расход") {
  const db = getDb();
  return db
    .select({
      counterpartyId: moneyOperations.counterpartyId,
      sum: sql<string>`coalesce(sum(${moneyOperations.amount}), 0)`,
    })
    .from(moneyOperations)
    .where(
      and(
        eq(moneyOperations.kind, kind),
        isNotNull(moneyOperations.counterpartyId)
      )
    )
    .groupBy(moneyOperations.counterpartyId);
}
