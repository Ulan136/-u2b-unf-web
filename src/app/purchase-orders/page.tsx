"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import Link from "next/link";

type OrderRow = {
  id: string;
  seq: number;
  orderDate: string | null;
  status: string;
  totalSum: string | null;
  supplierName: string;
};

type LineItem = {
  productId: string;
  productName: string;
  sku: string;
  unit: string | null;
  qty: string;
  price: string;
};

type Editor = {
  id?: string;
  seq?: number;
  orderDate: string;
  counterpartyId: string;
  counterpartyName: string;
  warehouseId: string;
  status: string;
  comment: string;
  items: LineItem[];
};

const STATUSES = ["Новый", "В работе", "Выполнен", "Отменён"];

function num(v: string | null | undefined) {
  const n = Number(v ?? 0);
  return Number.isFinite(n) ? n : 0;
}
function money(v: number) {
  return v.toLocaleString("ru-RU", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}
function docNo(seq?: number) {
  return seq ? `ЗАК-${String(seq).padStart(5, "0")}` : "новый";
}
function today() {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(
    d.getDate()
  ).padStart(2, "0")}`;
}

export default function PurchaseOrdersPage() {
  const [orders, setOrders] = useState<OrderRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [warehouses, setWarehouses] = useState<{ id: string; name: string }[]>([]);
  const [ed, setEd] = useState<Editor | null>(null);
  const [busy, setBusy] = useState(false);

  const loadList = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch("/api/purchase-orders");
      const json = await res.json();
      if (!json.ok) throw new Error(json.error ?? "Ошибка");
      setOrders(json.data);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Ошибка");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadList();
    fetch("/api/warehouses")
      .then((r) => r.json())
      .then((j) => j.ok && setWarehouses(j.data))
      .catch(() => {});
  }, [loadList]);

  function openNew() {
    setEd({
      orderDate: today(),
      counterpartyId: "",
      counterpartyName: "",
      warehouseId: "",
      status: "Новый",
      comment: "",
      items: [],
    });
  }

  async function openEdit(id: string) {
    setError(null);
    try {
      const res = await fetch(`/api/purchase-orders/${id}`);
      const json = await res.json();
      if (!json.ok) throw new Error(json.error ?? "Ошибка");
      const { order, items } = json.data;
      setEd({
        id: order.id,
        seq: order.seq,
        orderDate: order.orderDate ? String(order.orderDate).slice(0, 10) : today(),
        counterpartyId: order.counterpartyId,
        counterpartyName: order.supplierName,
        warehouseId: order.warehouseId ?? "",
        status: order.status,
        comment: order.comment ?? "",
        items: items.map((it: LineItem & { productName: string }) => ({
          productId: it.productId,
          productName: it.productName,
          sku: it.sku,
          unit: it.unit,
          qty: it.qty,
          price: it.price,
        })),
      });
    } catch (e) {
      setError(e instanceof Error ? e.message : "Ошибка");
    }
  }

  async function save() {
    if (!ed) return;
    setBusy(true);
    setError(null);
    try {
      const payload = {
        orderDate: ed.orderDate || undefined,
        counterpartyId: ed.counterpartyId,
        warehouseId: ed.warehouseId || null,
        status: ed.status,
        comment: ed.comment || null,
        items: ed.items.map((it) => ({
          productId: it.productId,
          qty: it.qty || "0",
          price: it.price || "0",
        })),
      };
      const res = await fetch(
        ed.id ? `/api/purchase-orders/${ed.id}` : "/api/purchase-orders",
        {
          method: ed.id ? "PATCH" : "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(payload),
        }
      );
      const json = await res.json();
      if (!json.ok) throw new Error(json.error ?? "Ошибка сохранения");
      setEd(null);
      await loadList();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Ошибка");
    } finally {
      setBusy(false);
    }
  }

  async function archive() {
    if (!ed?.id) return;
    if (!confirm(`Пометить на удаление заказ ${docNo(ed.seq)}?`)) return;
    setBusy(true);
    try {
      const res = await fetch(`/api/purchase-orders/${ed.id}`, { method: "DELETE" });
      const json = await res.json();
      if (!json.ok) throw new Error(json.error ?? "Ошибка");
      setEd(null);
      await loadList();
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
        <h1 className="text-lg font-semibold">Заказы поставщикам</h1>
      </header>

      <main className="max-w-6xl mx-auto p-4">
        <div className="mb-3">
          <button
            onClick={openNew}
            className="bg-green-600 text-white px-3 py-1.5 rounded text-sm font-medium hover:bg-green-700"
          >
            + Заказ поставщику
          </button>
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
                <th className="px-3 py-2 font-medium">Номер</th>
                <th className="px-3 py-2 font-medium">Дата</th>
                <th className="px-3 py-2 font-medium">Поставщик</th>
                <th className="px-3 py-2 font-medium">Статус</th>
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
              ) : orders.length === 0 ? (
                <tr>
                  <td colSpan={5} className="px-3 py-6 text-center text-gray-400">
                    Заказов поставщикам нет. Нажмите «+ Заказ поставщику».
                  </td>
                </tr>
              ) : (
                orders.map((o) => (
                  <tr
                    key={o.id}
                    className="border-t border-gray-100 hover:bg-yellow-50 cursor-pointer"
                    onClick={() => openEdit(o.id)}
                  >
                    <td className="px-3 py-2 font-mono text-blue-700">{docNo(o.seq)}</td>
                    <td className="px-3 py-2 text-gray-500">
                      {o.orderDate ? String(o.orderDate).slice(0, 10) : ""}
                    </td>
                    <td className="px-3 py-2">{o.supplierName}</td>
                    <td className="px-3 py-2">
                      <StatusBadge status={o.status} />
                    </td>
                    <td className="px-3 py-2 text-right font-mono">{money(num(o.totalSum))}</td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </main>

      {ed && (
        <PoEditor
          ed={ed}
          setEd={setEd}
          warehouses={warehouses}
          busy={busy}
          onSave={save}
          onArchive={archive}
          onClose={() => setEd(null)}
        />
      )}
    </div>
  );
}

function StatusBadge({ status }: { status: string }) {
  const color =
    status === "Выполнен"
      ? "bg-green-100 text-green-700"
      : status === "Отменён"
      ? "bg-gray-200 text-gray-500"
      : status === "В работе"
      ? "bg-blue-100 text-blue-700"
      : "bg-yellow-100 text-yellow-800";
  return <span className={`text-xs px-2 py-0.5 rounded ${color}`}>{status}</span>;
}

function PoEditor({
  ed,
  setEd,
  warehouses,
  busy,
  onSave,
  onArchive,
  onClose,
}: {
  ed: Editor;
  setEd: (e: Editor) => void;
  warehouses: { id: string; name: string }[];
  busy: boolean;
  onSave: () => void;
  onArchive: () => void;
  onClose: () => void;
}) {
  const total = useMemo(
    () => ed.items.reduce((s, it) => s + num(it.qty) * num(it.price), 0),
    [ed.items]
  );

  function addProduct(p: { id: string; name: string; sku: string; unit: string | null; price: string | null }) {
    if (ed.items.some((it) => it.productId === p.id)) return;
    setEd({
      ...ed,
      items: [
        ...ed.items,
        { productId: p.id, productName: p.name, sku: p.sku, unit: p.unit, qty: "1", price: p.price ?? "0" },
      ],
    });
  }
  function setItem(i: number, patch: Partial<LineItem>) {
    const items = ed.items.slice();
    items[i] = { ...items[i], ...patch };
    setEd({ ...ed, items });
  }
  function removeItem(i: number) {
    setEd({ ...ed, items: ed.items.filter((_, idx) => idx !== i) });
  }

  return (
    <div className="fixed inset-0 bg-black/40 flex items-start justify-center p-4 overflow-y-auto">
      <div className="bg-white rounded-lg shadow-lg w-full max-w-3xl mt-6 mb-10">
        <div className="px-4 py-3 border-b border-gray-200 flex items-center justify-between">
          <h3 className="font-semibold">Заказ поставщику {docNo(ed.seq)}</h3>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-700">
            ✕
          </button>
        </div>

        <div className="p-4 space-y-3">
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            <label className="block">
              <span className="text-xs text-gray-500 mb-1 block">Дата</span>
              <input
                type="date"
                value={ed.orderDate}
                onChange={(e) => setEd({ ...ed, orderDate: e.target.value })}
                className="input"
              />
            </label>
            <label className="block">
              <span className="text-xs text-gray-500 mb-1 block">Статус</span>
              <select
                value={ed.status}
                onChange={(e) => setEd({ ...ed, status: e.target.value })}
                className="input"
              >
                {STATUSES.map((s) => (
                  <option key={s}>{s}</option>
                ))}
              </select>
            </label>
            <label className="block">
              <span className="text-xs text-gray-500 mb-1 block">Склад поставки</span>
              <select
                value={ed.warehouseId}
                onChange={(e) => setEd({ ...ed, warehouseId: e.target.value })}
                className="input"
              >
                <option value="">—</option>
                {warehouses.map((w) => (
                  <option key={w.id} value={w.id}>
                    {w.name}
                  </option>
                ))}
              </select>
            </label>
          </div>

          <div>
            <span className="text-xs text-gray-500 mb-1 block">Поставщик *</span>
            {ed.counterpartyId ? (
              <div className="flex items-center gap-2 border border-gray-300 rounded px-3 py-1.5 text-sm">
                <span className="font-medium">{ed.counterpartyName}</span>
                <button
                  onClick={() => setEd({ ...ed, counterpartyId: "", counterpartyName: "" })}
                  className="ml-auto text-gray-400 hover:text-red-600 text-xs"
                >
                  сменить
                </button>
              </div>
            ) : (
              <SearchPicker
                placeholder="Поиск поставщика: наименование, БИН…"
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
                onPick={(it) => setEd({ ...ed, counterpartyId: it.id, counterpartyName: it.label })}
              />
            )}
          </div>

          <div>
            <span className="text-xs text-gray-500 mb-1 block">Товары</span>
            <div className="border border-gray-200 rounded overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="bg-gray-50 text-gray-500 text-left">
                  <tr>
                    <th className="px-2 py-1 font-medium">Номенклатура</th>
                    <th className="px-2 py-1 font-medium w-24 text-right">Кол-во</th>
                    <th className="px-2 py-1 font-medium w-28 text-right">Цена</th>
                    <th className="px-2 py-1 font-medium w-28 text-right">Сумма</th>
                    <th className="px-2 py-1 w-8"></th>
                  </tr>
                </thead>
                <tbody>
                  {ed.items.length === 0 ? (
                    <tr>
                      <td colSpan={5} className="px-2 py-3 text-center text-gray-400">
                        Нет строк
                      </td>
                    </tr>
                  ) : (
                    ed.items.map((it, i) => (
                      <tr key={it.productId} className="border-t border-gray-100">
                        <td className="px-2 py-1">
                          <span className="font-mono text-gray-400 text-xs">{it.sku}</span>{" "}
                          {it.productName}
                        </td>
                        <td className="px-2 py-1">
                          <input
                            value={it.qty}
                            onChange={(e) => setItem(i, { qty: e.target.value })}
                            className="input text-right"
                            inputMode="decimal"
                          />
                        </td>
                        <td className="px-2 py-1">
                          <input
                            value={it.price}
                            onChange={(e) => setItem(i, { price: e.target.value })}
                            className="input text-right"
                            inputMode="decimal"
                          />
                        </td>
                        <td className="px-2 py-1 text-right font-mono">
                          {money(num(it.qty) * num(it.price))}
                        </td>
                        <td className="px-2 py-1 text-center">
                          <button
                            onClick={() => removeItem(i)}
                            className="text-gray-400 hover:text-red-600"
                          >
                            ✕
                          </button>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
            <div className="mt-2">
              <SearchPicker
                placeholder="+ Добавить товар (поиск по наименованию, артикулу…)"
                search={async (q) => {
                  const r = await fetch(`/api/products?q=${encodeURIComponent(q)}`);
                  const j = await r.json();
                  return j.ok
                    ? j.data.items.map(
                        (p: { id: string; name: string; sku: string; unit: string | null; price: string | null }) => ({
                          id: p.id,
                          label: p.name,
                          sub: p.sku,
                          raw: p,
                        })
                      )
                    : [];
                }}
                onPick={(it) => it.raw && addProduct(it.raw)}
              />
            </div>
          </div>

          <label className="block">
            <span className="text-xs text-gray-500 mb-1 block">Комментарий</span>
            <input
              value={ed.comment}
              onChange={(e) => setEd({ ...ed, comment: e.target.value })}
              className="input"
            />
          </label>

          <div className="text-right text-base font-semibold">Итого: {money(total)}</div>
        </div>

        <div className="px-4 py-3 border-t border-gray-200 flex items-center gap-2">
          {ed.id && (
            <button
              onClick={onArchive}
              disabled={busy}
              className="px-3 py-1.5 rounded text-sm text-red-600 border border-red-200 hover:bg-red-50 disabled:opacity-50"
            >
              Пометить на удаление
            </button>
          )}
          <div className="ml-auto flex gap-2">
            <button
              onClick={onClose}
              className="px-3 py-1.5 rounded text-sm border border-gray-300 hover:bg-gray-50"
            >
              Отмена
            </button>
            <button
              onClick={onSave}
              disabled={busy || !ed.counterpartyId || ed.items.length === 0}
              className="px-4 py-1.5 rounded text-sm bg-green-600 text-white font-medium hover:bg-green-700 disabled:opacity-50"
            >
              {busy ? "Сохранение…" : "Записать"}
            </button>
          </div>
        </div>
      </div>

      <style jsx global>{`
        .input {
          width: 100%;
          border: 1px solid #d1d5db;
          border-radius: 0.375rem;
          padding: 0.375rem 0.5rem;
          font-size: 0.875rem;
        }
      `}</style>
    </div>
  );
}

type PickItem = { id: string; label: string; sub?: string; raw?: any };

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
        <div className="absolute z-10 left-0 right-0 bg-white border border-gray-200 rounded shadow-lg mt-1 max-h-64 overflow-y-auto">
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
