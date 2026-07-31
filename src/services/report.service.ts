import * as repo from "@/repositories/reports.repo";

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
