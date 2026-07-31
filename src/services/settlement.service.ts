import * as repo from "@/repositories/settlements.repo";

/** Взаиморасчёты по контрагентам: долг клиента и наш долг поставщику. */

type Row = {
  counterpartyId: string;
  name: string;
  shipped: number; // отгружено покупателю
  paidIn: number; // денег получено от него
  customerDebt: number; // должен нам = отгружено − получено
  received: number; // оприходовано от поставщика
  paidOut: number; // денег выплачено ему
  supplierDebt: number; // мы должны = оприходовано − выплачено
};

export async function getSettlements() {
  const [sales, purchases, moneyIn, moneyOut] = await Promise.all([
    repo.salesByCounterparty(),
    repo.purchasesByCounterparty(),
    repo.moneyByCounterparty("Приход"),
    repo.moneyByCounterparty("Расход"),
  ]);

  const map = new Map<string, Row>();
  const ensure = (id: string, name?: string): Row => {
    let r = map.get(id);
    if (!r) {
      r = {
        counterpartyId: id,
        name: name ?? "",
        shipped: 0,
        paidIn: 0,
        customerDebt: 0,
        received: 0,
        paidOut: 0,
        supplierDebt: 0,
      };
      map.set(id, r);
    }
    if (name && !r.name) r.name = name;
    return r;
  };

  for (const s of sales) ensure(s.counterpartyId, s.name).shipped = Number(s.sum);
  for (const p of purchases) ensure(p.counterpartyId, p.name).received = Number(p.sum);
  for (const m of moneyIn) {
    if (m.counterpartyId) ensure(m.counterpartyId).paidIn = Number(m.sum);
  }
  for (const m of moneyOut) {
    if (m.counterpartyId) ensure(m.counterpartyId).paidOut = Number(m.sum);
  }

  const rows = Array.from(map.values()).map((r) => ({
    ...r,
    customerDebt: +(r.shipped - r.paidIn).toFixed(2),
    supplierDebt: +(r.received - r.paidOut).toFixed(2),
  }));

  rows.sort((a, b) => b.customerDebt - a.customerDebt || b.supplierDebt - a.supplierDebt);

  const totals = {
    customerDebt: +rows.reduce((s, r) => s + r.customerDebt, 0).toFixed(2),
    supplierDebt: +rows.reduce((s, r) => s + r.supplierDebt, 0).toFixed(2),
  };

  return { rows, totals };
}
