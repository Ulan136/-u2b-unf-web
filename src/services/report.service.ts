import * as repo from "@/repositories/reports.repo";
import { listAccounts } from "@/repositories/money.repo";

/** Бизнес-логика отчётов. */

export async function stockReport(opts: {
  warehouseId?: string;
  q?: string;
  onlyNonZero?: boolean;
}) {
  const raw = await repo.stockReport({
    warehouseId: opts.warehouseId,
    q: opts.q,
  });

  const rows = raw
    .map((r) => {
      const qty = Number(r.qty ?? 0);
      const reserved = Number(r.reserved ?? 0);
      const cost = Number(r.costPrice ?? 0);
      return {
        productId: r.productId,
        sku: r.sku,
        name: r.name,
        unit: r.unit,
        qty,
        reserved,
        free: qty - reserved,
        costPrice: cost,
        value: +(qty * cost).toFixed(2), // стоимость остатка по себестоимости
      };
    })
    .filter((r) => (opts.onlyNonZero ? r.qty !== 0 : true));

  const totals = {
    positions: rows.length,
    value: +rows.reduce((s, r) => s + r.value, 0).toFixed(2),
  };

  return { rows, totals };
}

/** Отчёт «Продажи» за период [from, to] (по дате отгрузки заказов). */
export async function salesReport(opts: { from?: string; to?: string }) {
  // Диапазон по умолчанию — текущий месяц.
  const now = new Date();
  const defFrom = new Date(now.getFullYear(), now.getMonth(), 1);
  const defTo = new Date(now.getFullYear(), now.getMonth() + 1, 0);

  const from = opts.from ? new Date(`${opts.from}T00:00:00`) : defFrom;
  const toBase = opts.to ? new Date(`${opts.to}T00:00:00`) : defTo;
  // верхняя граница — включительно по дню: берём начало следующего дня
  const toExclusive = new Date(toBase);
  toExclusive.setDate(toExclusive.getDate() + 1);

  const raw = await repo.salesReport({ from, to: toExclusive });

  const rows = raw.map((r) => ({
    productId: r.productId,
    sku: r.sku,
    name: r.name,
    unit: r.unit,
    qty: Number(r.qty ?? 0),
    amount: +Number(r.amount ?? 0).toFixed(2),
  }));

  const totals = {
    positions: rows.length,
    amount: +rows.reduce((s, r) => s + r.amount, 0).toFixed(2),
  };

  const ymd = (d: Date) =>
    `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(
      d.getDate()
    ).padStart(2, "0")}`;

  return {
    rows,
    totals,
    period: {
      from: opts.from ?? ymd(defFrom),
      to: opts.to ?? ymd(defTo),
    },
  };
}

/** Отчёт «Закупки» за период [from, to] (по дате оприходования поступлений). */
export async function purchaseReport(opts: { from?: string; to?: string }) {
  const now = new Date();
  const defFrom = new Date(now.getFullYear(), now.getMonth(), 1);
  const defTo = new Date(now.getFullYear(), now.getMonth() + 1, 0);

  const from = opts.from ? new Date(`${opts.from}T00:00:00`) : defFrom;
  const toBase = opts.to ? new Date(`${opts.to}T00:00:00`) : defTo;
  const toExclusive = new Date(toBase);
  toExclusive.setDate(toExclusive.getDate() + 1);

  const raw = await repo.purchaseReport({ from, to: toExclusive });

  const rows = raw.map((r) => ({
    productId: r.productId,
    sku: r.sku,
    name: r.name,
    unit: r.unit,
    qty: Number(r.qty ?? 0),
    amount: +Number(r.amount ?? 0).toFixed(2),
  }));

  const totals = {
    positions: rows.length,
    amount: +rows.reduce((s, r) => s + r.amount, 0).toFixed(2),
  };

  const ymd = (d: Date) =>
    `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(
      d.getDate()
    ).padStart(2, "0")}`;

  return {
    rows,
    totals,
    period: { from: opts.from ?? ymd(defFrom), to: opts.to ?? ymd(defTo) },
  };
}

/** Отчёт «Движение денег» за период: входящий остаток, приход, расход, исходящий по счетам. */
export async function cashFlowReport(opts: { from?: string; to?: string }) {
  const now = new Date();
  const defFrom = new Date(now.getFullYear(), now.getMonth(), 1);
  const defTo = new Date(now.getFullYear(), now.getMonth() + 1, 0);

  const from = opts.from ? new Date(`${opts.from}T00:00:00`) : defFrom;
  const toBase = opts.to ? new Date(`${opts.to}T00:00:00`) : defTo;
  const toExclusive = new Date(toBase);
  toExclusive.setDate(toExclusive.getDate() + 1);

  const [accounts, flows, openings] = await Promise.all([
    listAccounts(),
    repo.cashFlow({ from, to: toExclusive }),
    repo.openingBalances(from),
  ]);

  const flowMap = new Map(flows.map((f) => [f.accountId, f]));
  const openMap = new Map(openings.map((o) => [o.accountId, Number(o.opening)]));

  const rows = accounts.map((a) => {
    const f = flowMap.get(a.id);
    const opening = openMap.get(a.id) ?? 0;
    const income = Number(f?.income ?? 0);
    const expense = Number(f?.expense ?? 0);
    return {
      accountId: a.id,
      name: a.name,
      kind: a.kind,
      opening: +opening.toFixed(2),
      income: +income.toFixed(2),
      expense: +expense.toFixed(2),
      closing: +(opening + income - expense).toFixed(2),
    };
  });

  const totals = {
    opening: +rows.reduce((s, r) => s + r.opening, 0).toFixed(2),
    income: +rows.reduce((s, r) => s + r.income, 0).toFixed(2),
    expense: +rows.reduce((s, r) => s + r.expense, 0).toFixed(2),
    closing: +rows.reduce((s, r) => s + r.closing, 0).toFixed(2),
  };

  const ymd2 = (d: Date) =>
    `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(
      d.getDate()
    ).padStart(2, "0")}`;

  return {
    rows,
    totals,
    period: { from: opts.from ?? ymd2(defFrom), to: opts.to ?? ymd2(defTo) },
  };
}
