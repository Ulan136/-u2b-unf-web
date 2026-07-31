"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";

type Row = {
  accountId: string;
  name: string;
  kind: string;
  opening: number;
  income: number;
  expense: number;
  closing: number;
};

function money(v: number) {
  return v.toLocaleString("ru-RU", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
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

export default function CashFlowPage() {
  const [rows, setRows] = useState<Row[]>([]);
  const [totals, setTotals] = useState({ opening: 0, income: 0, expense: 0, closing: 0 });
  const [from, setFrom] = useState(monthStart());
  const [to, setTo] = useState(monthEnd());
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const qs = new URLSearchParams({ from, to });
      const res = await fetch(`/api/reports/cashflow?${qs.toString()}`);
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
        <h1 className="text-lg font-semibold">Отчёт: Движение денег</h1>
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
                <th className="px-3 py-2 font-medium">Счёт / касса</th>
                <th className="px-3 py-2 font-medium text-right">Входящий остаток</th>
                <th className="px-3 py-2 font-medium text-right">Приход</th>
                <th className="px-3 py-2 font-medium text-right">Расход</th>
                <th className="px-3 py-2 font-medium text-right">Исходящий остаток</th>
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
                    Нет счетов
                  </td>
                </tr>
              ) : (
                rows.map((r) => (
                  <tr key={r.accountId} className="border-t border-gray-100 hover:bg-yellow-50">
                    <td className="px-3 py-2">
                      {r.kind === "Банк" ? "🏦" : "💵"} {r.name}
                    </td>
                    <td className="px-3 py-2 text-right font-mono text-gray-500">
                      {money(r.opening)}
                    </td>
                    <td className="px-3 py-2 text-right font-mono text-green-700">
                      {r.income ? "+" + money(r.income) : "—"}
                    </td>
                    <td className="px-3 py-2 text-right font-mono text-red-600">
                      {r.expense ? "−" + money(r.expense) : "—"}
                    </td>
                    <td
                      className={`px-3 py-2 text-right font-mono font-semibold ${
                        r.closing < 0 ? "text-red-600" : ""
                      }`}
                    >
                      {money(r.closing)}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
            {!loading && rows.length > 0 && (
              <tfoot>
                <tr className="border-t-2 border-gray-200 bg-gray-50 font-semibold">
                  <td className="px-3 py-2">Итого</td>
                  <td className="px-3 py-2 text-right font-mono">{money(totals.opening)}</td>
                  <td className="px-3 py-2 text-right font-mono text-green-700">
                    +{money(totals.income)}
                  </td>
                  <td className="px-3 py-2 text-right font-mono text-red-600">
                    −{money(totals.expense)}
                  </td>
                  <td className="px-3 py-2 text-right font-mono">{money(totals.closing)}</td>
                </tr>
              </tfoot>
            )}
          </table>
        </div>
        <p className="text-xs text-gray-400 mt-2">
          Исходящий остаток = входящий + приход − расход за период.
        </p>
      </main>
    </div>
  );
}
