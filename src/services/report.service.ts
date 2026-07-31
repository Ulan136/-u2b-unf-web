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
