"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";

type Row = {
  productId: string;
  sku: string;
  name: string;
  qty: number;
  revenue: number;
  cost: number;
  profit: number;
  margin: number;
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

export default function ProfitReportPage() {
  const [rows, setRows] = useState<Row[]>([]);
  const [totals, setTotals] = useState({ revenue: 0, cost: 0, profit: 0, margin: 0 });
  const [from, setFrom] = useState(monthStart());
  const [to, setTo] = useState(monthEnd());
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const qs = new URLSearchParams({ from, to });
      const res = await fetch(`/api/reports/profit?${qs.toString()}`);
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
        <h1 className="text-lg font-semibold">Отчёт: Прибыль</h1>
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
          <span className="text-sm text-gray-500 ml-auto">По отгруженным заказам</span>
        </div>

        {/* Сводка */}
        <div className="grid gap-3 sm:grid-cols-3 mb-4">
          <div className="bg-white border border-gray-200 rounded-lg p-4">
            <div className="text-xs text-gray-500">Выручка</div>
            <div className="text-lg font-mono font-semibold">{money(totals.revenue)} ₸</div>
          </div>
          <div className="bg-white border border-gray-200 rounded-lg p-4">
            <div className="text-xs text-gray-500">Себестоимость</div>
            <div className="text-lg font-mono font-semibold text-gray-600">
              {money(totals.cost)} ₸
            </div>
          </div>
          <div className="bg-white border border-gray-200 rounded-lg p-4">
            <div className="text-xs text-gray-500">Прибыль · рентабельность</div>
            <div
              className={`text-lg font-mono font-semibold ${
                totals.profit < 0 ? "text-red-600" : "text-green-700"
              }`}
            >
              {money(totals.profit)} ₸ · {totals.margin}%
            </div>
          </div>
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
                <th className="px-3 py-2 font-medium text-right">Продано</th>
                <th className="px-3 py-2 font-medium text-right">Выручка</th>
                <th className="px-3 py-2 font-medium text-right">Себест.</th>
                <th className="px-3 py-2 font-medium text-right">Прибыль</th>
                <th className="px-3 py-2 font-medium text-right">%</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr>
                  <td colSpan={7} className="px-3 py-6 text-center text-gray-400">
                    Загрузка…
                  </td>
                </tr>
              ) : rows.length === 0 ? (
                <tr>
                  <td colSpan={7} className="px-3 py-6 text-center text-gray-400">
                    За выбранный период продаж нет
                  </td>
                </tr>
              ) : (
                rows.map((r) => (
                  <tr key={r.productId} className="border-t border-gray-100 hover:bg-yellow-50">
                    <td className="px-3 py-2 font-mono text-gray-500">{r.sku}</td>
                    <td className="px-3 py-2">{r.name}</td>
                    <td className="px-3 py-2 text-right font-mono">{qtyFmt(r.qty)}</td>
                    <td className="px-3 py-2 text-right font-mono">{money(r.revenue)}</td>
                    <td className="px-3 py-2 text-right font-mono text-gray-500">
                      {money(r.cost)}
                    </td>
                    <td
                      className={`px-3 py-2 text-right font-mono ${
                        r.profit < 0 ? "text-red-600" : "text-green-700"
                      }`}
                    >
                      {money(r.profit)}
                    </td>
                    <td className="px-3 py-2 text-right font-mono text-gray-500">{r.margin}%</td>
                  </tr>
                ))
              )}
            </tbody>
            {!loading && rows.length > 0 && (
              <tfoot>
                <tr className="border-t-2 border-gray-200 bg-gray-50 font-semibold">
                  <td className="px-3 py-2" colSpan={3}>
                    Итого
                  </td>
                  <td className="px-3 py-2 text-right font-mono">{money(totals.revenue)}</td>
                  <td className="px-3 py-2 text-right font-mono text-gray-500">
                    {money(totals.cost)}
                  </td>
                  <td
                    className={`px-3 py-2 text-right font-mono ${
                      totals.profit < 0 ? "text-red-600" : "text-green-700"
                    }`}
                  >
                    {money(totals.profit)}
                  </td>
                  <td className="px-3 py-2 text-right font-mono">{totals.margin}%</td>
                </tr>
              </tfoot>
            )}
          </table>
        </div>
        <p className="text-xs text-gray-400 mt-2">
          Прибыль = выручка − себестоимость (по себестоимости из карточки товара). Только отгруженные
          заказы.
        </p>
      </main>
    </div>
  );
}
