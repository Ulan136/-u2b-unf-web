"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";

type Row = {
  productId: string;
  sku: string;
  name: string;
  unit: string | null;
  qty: number;
  amount: number;
};

function money(v: number) {
  return v.toLocaleString("ru-RU", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}
function qtyFmt(v: number) {
  return v.toLocaleString("ru-RU");
}
function ymd(d: Date) {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(
    d.getDate()
  ).padStart(2, "0")}`;
}
function monthStart() {
  const d = new Date();
  return ymd(new Date(d.getFullYear(), d.getMonth(), 1));
}
function monthEnd() {
  const d = new Date();
  return ymd(new Date(d.getFullYear(), d.getMonth() + 1, 0));
}

export default function PurchasesReportPage() {
  const [rows, setRows] = useState<Row[]>([]);
  const [totals, setTotals] = useState<{ positions: number; amount: number }>({
    positions: 0,
    amount: 0,
  });
  const [from, setFrom] = useState(monthStart());
  const [to, setTo] = useState(monthEnd());
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const qs = new URLSearchParams({ from, to });
      const res = await fetch(`/api/reports/purchases?${qs.toString()}`);
      const json = await res.json();
      if (!json.ok) throw new Error(json.error ?? "Ошибка");
      setRows(json.data.rows);
      setTotals(json.data.totals);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Ошибка");
    } finally {
      setLoading(false);
    }
  }, [from, to]);

  useEffect(() => {
    load();
  }, [load]);

  return (
    <div className="min-h-screen">
      <header className="bg-yellow-400 text-gray-900 px-6 py-3 shadow flex items-center gap-4">
        <Link href="/" className="text-sm hover:underline">
          ← Главная
        </Link>
        <h1 className="text-lg font-semibold">Отчёт: Закупки</h1>
      </header>

      <main className="max-w-6xl mx-auto p-4">
        <div className="flex flex-wrap items-end gap-3 mb-3">
          <label className="block">
            <span className="text-xs text-gray-500 mb-1 block">Период с</span>
            <input
              type="date"
              value={from}
              onChange={(e) => setFrom(e.target.value)}
              className="border border-gray-300 rounded px-2 py-1.5 text-sm"
            />
          </label>
          <label className="block">
            <span className="text-xs text-gray-500 mb-1 block">по</span>
            <input
              type="date"
              value={to}
              onChange={(e) => setTo(e.target.value)}
              className="border border-gray-300 rounded px-2 py-1.5 text-sm"
            />
          </label>
          <span className="text-sm text-gray-500 ml-auto">
            По оприходованным поступлениям
          </span>
        </div>

        {error && (
          <div className="bg-red-50 border border-red-200 text-red-700 text-sm rounded px-3 py-2 mb-3">
            {error}
          </div>
        )}

        <div className="bg-white border border-gray-200 rounded-lg overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-gray-50 text-gray-600 text-left">
              <tr>
                <th className="px-3 py-2 font-medium">Артикул</th>
                <th className="px-3 py-2 font-medium">Наименование</th>
                <th className="px-3 py-2 font-medium">Ед.</th>
                <th className="px-3 py-2 font-medium text-right">Закуплено</th>
                <th className="px-3 py-2 font-medium text-right">Сумма</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr>
                  <td colSpan={5} className="px-3 py-6 text-center text-gray-400">
                    Загрузка…
                  </td>
                </tr>
              ) : rows.length === 0 ? (
                <tr>
                  <td colSpan={5} className="px-3 py-6 text-center text-gray-400">
                    За выбранный период оприходований нет
                  </td>
                </tr>
              ) : (
                rows.map((r) => (
                  <tr key={r.productId} className="border-t border-gray-100 hover:bg-yellow-50">
                    <td className="px-3 py-2 font-mono text-gray-500">{r.sku}</td>
                    <td className="px-3 py-2">{r.name}</td>
                    <td className="px-3 py-2 text-gray-500">{r.unit}</td>
                    <td className="px-3 py-2 text-right font-mono">{qtyFmt(r.qty)}</td>
                    <td className="px-3 py-2 text-right font-mono">{money(r.amount)}</td>
                  </tr>
                ))
              )}
            </tbody>
            {!loading && rows.length > 0 && (
              <tfoot>
                <tr className="border-t-2 border-gray-200 bg-gray-50 font-semibold">
                  <td className="px-3 py-2" colSpan={4}>
                    Итого позиций: {totals.positions}
                  </td>
                  <td className="px-3 py-2 text-right font-mono">{money(totals.amount)}</td>
                </tr>
              </tfoot>
            )}
          </table>
        </div>
        <p className="text-xs text-gray-400 mt-2">
          В отчёт попадают только оприходованные поступления (по дате прихода).
        </p>
      </main>
    </div>
  );
}
