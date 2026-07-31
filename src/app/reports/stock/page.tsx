"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";

type Row = {
  productId: string;
  sku: string;
  name: string;
  unit: string | null;
  qty: number;
  reserved: number;
  free: number;
  costPrice: number;
  value: number;
};

function money(v: number) {
  return v.toLocaleString("ru-RU", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}
function qtyFmt(v: number) {
  return v.toLocaleString("ru-RU");
}

export default function StockReportPage() {
  const [rows, setRows] = useState<Row[]>([]);
  const [totals, setTotals] = useState<{ positions: number; value: number }>({
    positions: 0,
    value: 0,
  });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [warehouses, setWarehouses] = useState<{ id: string; name: string }[]>([]);
  const [whFilter, setWhFilter] = useState("");
  const [search, setSearch] = useState("");
  const [onlyNonZero, setOnlyNonZero] = useState(true);

  useEffect(() => {
    fetch("/api/warehouses")
      .then((r) => r.json())
      .then((j) => j.ok && setWarehouses(j.data))
      .catch(() => {});
  }, []);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const qs = new URLSearchParams();
      if (whFilter) qs.set("warehouseId", whFilter);
      if (search.trim()) qs.set("q", search.trim());
      if (onlyNonZero) qs.set("onlyNonZero", "1");
      const res = await fetch(`/api/reports/stock?${qs.toString()}`);
      const json = await res.json();
      if (!json.ok) throw new Error(json.error ?? "Ошибка");
      setRows(json.data.rows);
      setTotals(json.data.totals);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Ошибка");
    } finally {
      setLoading(false);
    }
  }, [whFilter, search, onlyNonZero]);

  useEffect(() => {
    const t = setTimeout(load, search ? 300 : 0);
    return () => clearTimeout(t);
  }, [load, search]);

  return (
    <div className="min-h-screen">
      <header className="bg-yellow-400 text-gray-900 px-6 py-3 shadow flex items-center gap-4">
        <Link href="/" className="text-sm hover:underline">
          ← Главная
        </Link>
        <h1 className="text-lg font-semibold">Отчёт: Остатки товаров</h1>
      </header>

      <main className="max-w-6xl mx-auto p-4">
        <div className="flex flex-wrap items-center gap-2 mb-3">
          <select
            value={whFilter}
            onChange={(e) => setWhFilter(e.target.value)}
            className="border border-gray-300 rounded px-2 py-1.5 text-sm"
          >
            <option value="">Все склады</option>
            {warehouses.map((w) => (
              <option key={w.id} value={w.id}>
                {w.name}
              </option>
            ))}
          </select>
          <label className="flex items-center gap-2 text-sm text-gray-700">
            <input
              type="checkbox"
              checked={onlyNonZero}
              onChange={(e) => setOnlyNonZero(e.target.checked)}
            />
            Только с остатком
          </label>
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Поиск: наименование, артикул…"
            className="ml-auto border border-gray-300 rounded px-3 py-1.5 text-sm w-72 max-w-full"
          />
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
                <th className="px-3 py-2 font-medium text-right">Остаток</th>
                <th className="px-3 py-2 font-medium text-right">Резерв</th>
                <th className="px-3 py-2 font-medium text-right">Свободно</th>
                <th className="px-3 py-2 font-medium text-right">Себест.</th>
                <th className="px-3 py-2 font-medium text-right">Стоимость</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr>
                  <td colSpan={8} className="px-3 py-6 text-center text-gray-400">
                    Загрузка…
                  </td>
                </tr>
              ) : rows.length === 0 ? (
                <tr>
                  <td colSpan={8} className="px-3 py-6 text-center text-gray-400">
                    Нет данных
                  </td>
                </tr>
              ) : (
                rows.map((r) => (
                  <tr key={r.productId} className="border-t border-gray-100 hover:bg-yellow-50">
                    <td className="px-3 py-2 font-mono text-gray-500">{r.sku}</td>
                    <td className="px-3 py-2">{r.name}</td>
                    <td className="px-3 py-2 text-gray-500">{r.unit}</td>
                    <td className="px-3 py-2 text-right font-mono">{qtyFmt(r.qty)}</td>
                    <td className="px-3 py-2 text-right font-mono text-gray-500">
                      {r.reserved ? qtyFmt(r.reserved) : ""}
                    </td>
                    <td
                      className={`px-3 py-2 text-right font-mono ${
                        r.free <= 0 ? "text-red-600" : ""
                      }`}
                    >
                      {qtyFmt(r.free)}
                    </td>
                    <td className="px-3 py-2 text-right font-mono text-gray-500">
                      {r.costPrice ? money(r.costPrice) : ""}
                    </td>
                    <td className="px-3 py-2 text-right font-mono">{money(r.value)}</td>
                  </tr>
                ))
              )}
            </tbody>
            {!loading && rows.length > 0 && (
              <tfoot>
                <tr className="border-t-2 border-gray-200 bg-gray-50 font-semibold">
                  <td className="px-3 py-2" colSpan={7}>
                    Итого позиций: {totals.positions}
                  </td>
                  <td className="px-3 py-2 text-right font-mono">{money(totals.value)}</td>
                </tr>
              </tfoot>
            )}
          </table>
        </div>
        <p className="text-xs text-gray-400 mt-2">
          Стоимость остатка рассчитана по себестоимости.
        </p>
      </main>
    </div>
  );
}
