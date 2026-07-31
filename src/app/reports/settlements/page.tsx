"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";

type Row = {
  counterpartyId: string;
  name: string;
  shipped: number;
  paidIn: number;
  customerDebt: number;
  received: number;
  paidOut: number;
  supplierDebt: number;
};

function money(v: number) {
  return v.toLocaleString("ru-RU", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

// Долг с цветом: >0 нам должны/мы должны (акцент), <0 переплата (серый).
function DebtCell({ v }: { v: number }) {
  if (!v) return <span className="text-gray-300">—</span>;
  return (
    <span className={v > 0 ? "font-semibold" : "text-gray-400"}>{money(v)}</span>
  );
}

export default function SettlementsPage() {
  const [rows, setRows] = useState<Row[]>([]);
  const [totals, setTotals] = useState<{ customerDebt: number; supplierDebt: number }>({
    customerDebt: 0,
    supplierDebt: 0,
  });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch("/api/reports/settlements");
      const json = await res.json();
      if (!json.ok) throw new Error(json.error ?? "Ошибка");
      setRows(json.data.rows);
      setTotals(json.data.totals);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Ошибка");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  return (
    <div className="min-h-screen">
      <header className="bg-yellow-400 text-gray-900 px-6 py-3 shadow flex items-center gap-4">
        <Link href="/" className="text-sm hover:underline">
          ← Главная
        </Link>
        <h1 className="text-lg font-semibold">Взаиморасчёты с контрагентами</h1>
      </header>

      <main className="max-w-6xl mx-auto p-4">
        <div className="grid gap-3 sm:grid-cols-2 mb-4">
          <div className="bg-white border border-gray-200 rounded-lg p-4">
            <div className="text-xs text-gray-500">Покупатели должны нам</div>
            <div className="text-xl font-mono font-semibold text-green-700">
              {money(totals.customerDebt)} ₸
            </div>
          </div>
          <div className="bg-white border border-gray-200 rounded-lg p-4">
            <div className="text-xs text-gray-500">Мы должны поставщикам</div>
            <div className="text-xl font-mono font-semibold text-red-600">
              {money(totals.supplierDebt)} ₸
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
                <th className="px-3 py-2 font-medium">Контрагент</th>
                <th className="px-3 py-2 font-medium text-right">Отгружено</th>
                <th className="px-3 py-2 font-medium text-right">Оплатил</th>
                <th className="px-3 py-2 font-medium text-right">Должен нам</th>
                <th className="px-3 py-2 font-medium text-right">Оприходовано</th>
                <th className="px-3 py-2 font-medium text-right">Выплачено</th>
                <th className="px-3 py-2 font-medium text-right">Мы должны</th>
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
                    Нет данных по взаиморасчётам
                  </td>
                </tr>
              ) : (
                rows.map((r) => (
                  <tr key={r.counterpartyId} className="border-t border-gray-100 hover:bg-yellow-50">
                    <td className="px-3 py-2">{r.name}</td>
                    <td className="px-3 py-2 text-right font-mono text-gray-500">
                      {r.shipped ? money(r.shipped) : "—"}
                    </td>
                    <td className="px-3 py-2 text-right font-mono text-gray-500">
                      {r.paidIn ? money(r.paidIn) : "—"}
                    </td>
                    <td className="px-3 py-2 text-right font-mono text-green-700">
                      <DebtCell v={r.customerDebt} />
                    </td>
                    <td className="px-3 py-2 text-right font-mono text-gray-500">
                      {r.received ? money(r.received) : "—"}
                    </td>
                    <td className="px-3 py-2 text-right font-mono text-gray-500">
                      {r.paidOut ? money(r.paidOut) : "—"}
                    </td>
                    <td className="px-3 py-2 text-right font-mono text-red-600">
                      <DebtCell v={r.supplierDebt} />
                    </td>
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
                  <td className="px-3 py-2 text-right font-mono text-green-700">
                    {money(totals.customerDebt)}
                  </td>
                  <td className="px-3 py-2" colSpan={2}></td>
                  <td className="px-3 py-2 text-right font-mono text-red-600">
                    {money(totals.supplierDebt)}
                  </td>
                </tr>
              </tfoot>
            )}
          </table>
        </div>
        <p className="text-xs text-gray-400 mt-2">
          «Должен нам» = отгружено − оплатил. «Мы должны» = оприходовано − выплачено. Отрицательное —
          переплата/аванс.
        </p>
      </main>
    </div>
  );
}
