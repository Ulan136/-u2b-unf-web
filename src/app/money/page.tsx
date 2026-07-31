"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";

type Account = {
  id: string;
  name: string;
  kind: string;
  isDefault: boolean | null;
  balance: string;
};

type Operation = {
  id: string;
  seq: number;
  opDate: string | null;
  kind: string;
  amount: string;
  comment: string | null;
  accountName: string;
  counterpartyName: string | null;
};

function num(v: string | null | undefined) {
  const n = Number(v ?? 0);
  return Number.isFinite(n) ? n : 0;
}
function money(v: number) {
  return v.toLocaleString("ru-RU", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}
function today() {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(
    d.getDate()
  ).padStart(2, "0")}`;
}

export default function MoneyPage() {
  const [accounts, setAccounts] = useState<Account[]>([]);
  const [operations, setOperations] = useState<Operation[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [accFilter, setAccFilter] = useState("");
  const [busy, setBusy] = useState(false);

  const [opForm, setOpForm] = useState<null | {
    kind: "Приход" | "Расход";
    accountId: string;
    amount: string;
    counterpartyId: string;
    counterpartyName: string;
    comment: string;
    opDate: string;
  }>(null);
  const [accForm, setAccForm] = useState<null | {
    name: string;
    kind: string;
    isDefault: boolean;
  }>(null);

  const loadAccounts = useCallback(async () => {
    const res = await fetch("/api/money/accounts");
    const json = await res.json();
    if (json.ok) setAccounts(json.data);
  }, []);

  const loadOperations = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const qs = new URLSearchParams();
      if (accFilter) qs.set("accountId", accFilter);
      const res = await fetch(`/api/money/operations?${qs.toString()}`);
      const json = await res.json();
      if (!json.ok) throw new Error(json.error ?? "Ошибка");
      setOperations(json.data);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Ошибка");
    } finally {
      setLoading(false);
    }
  }, [accFilter]);

  useEffect(() => {
    loadAccounts();
  }, [loadAccounts]);
  useEffect(() => {
    loadOperations();
  }, [loadOperations]);

  const totalBalance = accounts.reduce((s, a) => s + num(a.balance), 0);

  function openOp(kind: "Приход" | "Расход") {
    const def = accounts.find((a) => a.isDefault) ?? accounts[0];
    setOpForm({
      kind,
      accountId: accFilter || def?.id || "",
      amount: "",
      counterpartyId: "",
      counterpartyName: "",
      comment: "",
      opDate: today(),
    });
  }

  async function saveOp() {
    if (!opForm) return;
    setBusy(true);
    setError(null);
    try {
      const res = await fetch("/api/money/operations", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          kind: opForm.kind,
          accountId: opForm.accountId,
          amount: opForm.amount,
          counterpartyId: opForm.counterpartyId || undefined,
          comment: opForm.comment || undefined,
          opDate: opForm.opDate || undefined,
        }),
      });
      const json = await res.json();
      if (!json.ok) throw new Error(json.error ?? "Ошибка");
      setOpForm(null);
      await Promise.all([loadAccounts(), loadOperations()]);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Ошибка");
    } finally {
      setBusy(false);
    }
  }

  async function saveAcc() {
    if (!accForm) return;
    setBusy(true);
    setError(null);
    try {
      const res = await fetch("/api/money/accounts", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(accForm),
      });
      const json = await res.json();
      if (!json.ok) throw new Error(json.error ?? "Ошибка");
      setAccForm(null);
      await loadAccounts();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Ошибка");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="min-h-screen">
      <header className="bg-yellow-400 text-gray-900 px-6 py-3 shadow flex items-center gap-4">
        <Link href="/" className="text-sm hover:underline">
          ← Главная
        </Link>
        <h1 className="text-lg font-semibold">Деньги (касса и банк)</h1>
      </header>

      <main className="max-w-6xl mx-auto p-4">
        {/* Карточки счетов */}
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3 mb-4">
          {accounts.map((a) => (
            <div
              key={a.id}
              className={`bg-white border rounded-lg p-4 ${
                accFilter === a.id ? "border-yellow-400" : "border-gray-200"
              } cursor-pointer`}
              onClick={() => setAccFilter(accFilter === a.id ? "" : a.id)}
            >
              <div className="text-xs text-gray-500">
                {a.kind === "Банк" ? "🏦 Банк" : "💵 Касса"}
                {a.isDefault && " · основной"}
              </div>
              <div className="font-semibold">{a.name}</div>
              <div
                className={`text-lg font-mono ${
                  num(a.balance) < 0 ? "text-red-600" : "text-gray-900"
                }`}
              >
                {money(num(a.balance))} ₸
              </div>
            </div>
          ))}
          <button
            onClick={() => setAccForm({ name: "", kind: "Касса", isDefault: false })}
            className="border border-dashed border-gray-300 rounded-lg p-4 text-gray-500 hover:border-yellow-400 hover:text-gray-700"
          >
            + Счёт / касса
          </button>
        </div>

        {/* Панель действий */}
        <div className="flex flex-wrap items-center gap-2 mb-3">
          <button
            onClick={() => openOp("Приход")}
            disabled={accounts.length === 0}
            className="bg-green-600 text-white px-3 py-1.5 rounded text-sm font-medium hover:bg-green-700 disabled:opacity-50"
          >
            + Приход
          </button>
          <button
            onClick={() => openOp("Расход")}
            disabled={accounts.length === 0}
            className="bg-red-600 text-white px-3 py-1.5 rounded text-sm font-medium hover:bg-red-700 disabled:opacity-50"
          >
            − Расход
          </button>
          <select
            value={accFilter}
            onChange={(e) => setAccFilter(e.target.value)}
            className="border border-gray-300 rounded px-2 py-1.5 text-sm"
          >
            <option value="">Все счета</option>
            {accounts.map((a) => (
              <option key={a.id} value={a.id}>
                {a.name}
              </option>
            ))}
          </select>
          <div className="ml-auto text-sm">
            Итого денег:{" "}
            <b className="font-mono">{money(totalBalance)} ₸</b>
          </div>
        </div>

        {error && (
          <div className="bg-red-50 border border-red-200 text-red-700 text-sm rounded px-3 py-2 mb-3">
            {error}
          </div>
        )}

        {/* Лента операций */}
        <div className="bg-white border border-gray-200 rounded-lg overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-gray-50 text-gray-600 text-left">
              <tr>
                <th className="px-3 py-2 font-medium">Дата</th>
                <th className="px-3 py-2 font-medium">Операция</th>
                <th className="px-3 py-2 font-medium">Счёт</th>
                <th className="px-3 py-2 font-medium">Контрагент</th>
                <th className="px-3 py-2 font-medium">Комментарий</th>
                <th className="px-3 py-2 font-medium text-right">Сумма</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr>
                  <td colSpan={6} className="px-3 py-6 text-center text-gray-400">
                    Загрузка…
                  </td>
                </tr>
              ) : operations.length === 0 ? (
                <tr>
                  <td colSpan={6} className="px-3 py-6 text-center text-gray-400">
                    Операций нет
                  </td>
                </tr>
              ) : (
                operations.map((o) => (
                  <tr key={o.id} className="border-t border-gray-100">
                    <td className="px-3 py-2 text-gray-500 whitespace-nowrap">
                      {o.opDate ? String(o.opDate).slice(0, 10) : ""}
                    </td>
                    <td className="px-3 py-2">
                      <span
                        className={
                          o.kind === "Приход" ? "text-green-700" : "text-red-600"
                        }
                      >
                        {o.kind}
                      </span>
                    </td>
                    <td className="px-3 py-2 text-gray-500">{o.accountName}</td>
                    <td className="px-3 py-2 text-gray-500">{o.counterpartyName}</td>
                    <td className="px-3 py-2 text-gray-500">{o.comment}</td>
                    <td
                      className={`px-3 py-2 text-right font-mono ${
                        o.kind === "Приход" ? "text-green-700" : "text-red-600"
                      }`}
                    >
                      {o.kind === "Приход" ? "+" : "−"}
                      {money(num(o.amount))}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </main>

      {/* Модалка операции */}
      {opForm && (
        <Modal
          title={opForm.kind === "Приход" ? "Приход денег" : "Расход денег"}
          onClose={() => setOpForm(null)}
        >
          <div className="grid grid-cols-2 gap-3">
            <Field label="Сумма *">
              <input
                autoFocus
                value={opForm.amount}
                onChange={(e) => setOpForm({ ...opForm, amount: e.target.value })}
                className="input"
                inputMode="decimal"
              />
            </Field>
            <Field label="Дата">
              <input
                type="date"
                value={opForm.opDate}
                onChange={(e) => setOpForm({ ...opForm, opDate: e.target.value })}
                className="input"
              />
            </Field>
          </div>
          <Field label="Счёт / касса">
            <select
              value={opForm.accountId}
              onChange={(e) => setOpForm({ ...opForm, accountId: e.target.value })}
              className="input"
            >
              {accounts.map((a) => (
                <option key={a.id} value={a.id}>
                  {a.name}
                </option>
              ))}
            </select>
          </Field>
          <div>
            <span className="text-xs text-gray-500 mb-1 block">Контрагент (необязательно)</span>
            {opForm.counterpartyId ? (
              <div className="flex items-center gap-2 border border-gray-300 rounded px-3 py-1.5 text-sm">
                <span className="font-medium">{opForm.counterpartyName}</span>
                <button
                  onClick={() =>
                    setOpForm({ ...opForm, counterpartyId: "", counterpartyName: "" })
                  }
                  className="ml-auto text-gray-400 hover:text-red-600 text-xs"
                >
                  убрать
                </button>
              </div>
            ) : (
              <SearchPicker
                placeholder="Поиск контрагента…"
                search={async (q) => {
                  const r = await fetch(`/api/counterparties?q=${encodeURIComponent(q)}`);
                  const j = await r.json();
                  return j.ok
                    ? j.data.items.map((c: { id: string; name: string; bin: string | null }) => ({
                        id: c.id,
                        label: c.name,
                        sub: c.bin ?? "",
                      }))
                    : [];
                }}
                onPick={(it) =>
                  setOpForm({ ...opForm, counterpartyId: it.id, counterpartyName: it.label })
                }
              />
            )}
          </div>
          <Field label="Комментарий">
            <input
              value={opForm.comment}
              onChange={(e) => setOpForm({ ...opForm, comment: e.target.value })}
              className="input"
            />
          </Field>
          <div className="flex justify-end gap-2 pt-2">
            <button
              onClick={() => setOpForm(null)}
              className="px-3 py-1.5 rounded text-sm border border-gray-300 hover:bg-gray-50"
            >
              Отмена
            </button>
            <button
              onClick={saveOp}
              disabled={busy || !opForm.amount.trim() || !opForm.accountId}
              className="px-4 py-1.5 rounded text-sm bg-green-600 text-white font-medium hover:bg-green-700 disabled:opacity-50"
            >
              {busy ? "Сохранение…" : "Записать"}
            </button>
          </div>
        </Modal>
      )}

      {/* Модалка счёта */}
      {accForm && (
        <Modal title="Новый счёт / касса" onClose={() => setAccForm(null)}>
          <Field label="Название *">
            <input
              autoFocus
              value={accForm.name}
              onChange={(e) => setAccForm({ ...accForm, name: e.target.value })}
              className="input"
            />
          </Field>
          <Field label="Тип">
            <select
              value={accForm.kind}
              onChange={(e) => setAccForm({ ...accForm, kind: e.target.value })}
              className="input"
            >
              <option>Касса</option>
              <option>Банк</option>
            </select>
          </Field>
          <label className="flex items-center gap-2 text-sm">
            <input
              type="checkbox"
              checked={accForm.isDefault}
              onChange={(e) => setAccForm({ ...accForm, isDefault: e.target.checked })}
            />
            Основной счёт
          </label>
          <div className="flex justify-end gap-2 pt-2">
            <button
              onClick={() => setAccForm(null)}
              className="px-3 py-1.5 rounded text-sm border border-gray-300 hover:bg-gray-50"
            >
              Отмена
            </button>
            <button
              onClick={saveAcc}
              disabled={busy || !accForm.name.trim()}
              className="px-4 py-1.5 rounded text-sm bg-green-600 text-white font-medium hover:bg-green-700 disabled:opacity-50"
            >
              {busy ? "Сохранение…" : "Записать"}
            </button>
          </div>
        </Modal>
      )}

      <style jsx global>{`
        .input {
          width: 100%;
          border: 1px solid #d1d5db;
          border-radius: 0.375rem;
          padding: 0.375rem 0.625rem;
          font-size: 0.875rem;
        }
      `}</style>
    </div>
  );
}

function Modal({
  title,
  onClose,
  children,
}: {
  title: string;
  onClose: () => void;
  children: React.ReactNode;
}) {
  return (
    <div className="fixed inset-0 bg-black/40 flex items-start justify-center p-4 overflow-y-auto">
      <div className="bg-white rounded-lg shadow-lg w-full max-w-md mt-10 mb-10">
        <div className="px-4 py-3 border-b border-gray-200 flex items-center justify-between">
          <h3 className="font-semibold">{title}</h3>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-700">
            ✕
          </button>
        </div>
        <div className="p-4 space-y-3">{children}</div>
      </div>
    </div>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <label className="block">
      <span className="text-xs text-gray-500 mb-1 block">{label}</span>
      {children}
    </label>
  );
}

type PickItem = { id: string; label: string; sub?: string };

function SearchPicker({
  placeholder,
  search,
  onPick,
}: {
  placeholder: string;
  search: (q: string) => Promise<PickItem[]>;
  onPick: (it: PickItem) => void;
}) {
  const [q, setQ] = useState("");
  const [results, setResults] = useState<PickItem[]>([]);
  const [open, setOpen] = useState(false);

  useEffect(() => {
    if (!q.trim()) {
      setResults([]);
      return;
    }
    const t = setTimeout(async () => {
      try {
        setResults(await search(q.trim()));
        setOpen(true);
      } catch {
        setResults([]);
      }
    }, 300);
    return () => clearTimeout(t);
  }, [q, search]);

  return (
    <div className="relative">
      <input
        value={q}
        onChange={(e) => setQ(e.target.value)}
        onFocus={() => results.length && setOpen(true)}
        placeholder={placeholder}
        className="input"
      />
      {open && results.length > 0 && (
        <div className="absolute z-10 left-0 right-0 bg-white border border-gray-200 rounded shadow-lg mt-1 max-h-56 overflow-y-auto">
          {results.map((it) => (
            <button
              key={it.id}
              onClick={() => {
                onPick(it);
                setQ("");
                setResults([]);
                setOpen(false);
              }}
              className="block w-full text-left px-3 py-2 text-sm hover:bg-yellow-50 border-b border-gray-50"
            >
              {it.label}
              {it.sub && <span className="text-gray-400 text-xs ml-2">{it.sub}</span>}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
