"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";

type SpecRow = {
  id: string;
  name: string;
  outputQty: string;
  productId: string;
  productName: string;
  productSku: string;
  itemsCount: number;
};

type MatItem = {
  materialProductId: string;
  materialName: string;
  sku: string;
  unit: string | null;
  qty: string;
};

type Editor = {
  id?: string;
  productId: string;
  productName: string;
  name: string;
  outputQty: string;
  items: MatItem[];
};

function qtyFmt(v: string) {
  const n = Number(v ?? 0);
  return (Number.isFinite(n) ? n : 0).toLocaleString("ru-RU");
}

export default function SpecificationsPage() {
  const [rows, setRows] = useState<SpecRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [ed, setEd] = useState<Editor | null>(null);
  const [busy, setBusy] = useState(false);

  const loadList = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch("/api/specifications");
      const json = await res.json();
      if (!json.ok) throw new Error(json.error ?? "Ошибка");
      setRows(json.data);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Ошибка");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadList();
  }, [loadList]);

  function openNew() {
    setEd({ productId: "", productName: "", name: "Основная", outputQty: "1", items: [] });
  }

  async function openEdit(id: string) {
    setError(null);
    try {
      const res = await fetch(`/api/specifications/${id}`);
      const json = await res.json();
      if (!json.ok) throw new Error(json.error ?? "Ошибка");
      const { spec, items } = json.data;
      setEd({
        id: spec.id,
        productId: spec.productId,
        productName: spec.productName,
        name: spec.name,
        outputQty: spec.outputQty,
        items: items.map((it: MatItem) => ({
          materialProductId: it.materialProductId,
          materialName: it.materialName,
          sku: it.sku,
          unit: it.unit,
          qty: it.qty,
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
        productId: ed.productId,
        name: ed.name || "Основная",
        outputQty: ed.outputQty || "1",
        items: ed.items.map((it) => ({
          materialProductId: it.materialProductId,
          qty: it.qty || "0",
        })),
      };
      const res = await fetch(
        ed.id ? `/api/specifications/${ed.id}` : "/api/specifications",
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
    if (!confirm("Пометить спецификацию на удаление?")) return;
    setBusy(true);
    try {
      const res = await fetch(`/api/specifications/${ed.id}`, { method: "DELETE" });
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
        <h1 className="text-lg font-semibold">Спецификации (состав изделий)</h1>
      </header>

      <main className="max-w-5xl mx-auto p-4">
        <div className="mb-3">
          <button
            onClick={openNew}
            className="bg-green-600 text-white px-3 py-1.5 rounded text-sm font-medium hover:bg-green-700"
          >
            + Спецификация
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
                <th className="px-3 py-2 font-medium">Изделие</th>
                <th className="px-3 py-2 font-medium">Спецификация</th>
                <th className="px-3 py-2 font-medium text-right">Выпуск</th>
                <th className="px-3 py-2 font-medium text-right">Материалов</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr>
                  <td colSpan={4} className="px-3 py-6 text-center text-gray-400">
                    Загрузка…
                  </td>
                </tr>
              ) : rows.length === 0 ? (
                <tr>
                  <td colSpan={4} className="px-3 py-6 text-center text-gray-400">
                    Спецификаций нет. Нажмите «+ Спецификация».
                  </td>
                </tr>
              ) : (
                rows.map((r) => (
                  <tr
                    key={r.id}
                    className="border-t border-gray-100 hover:bg-yellow-50 cursor-pointer"
                    onClick={() => openEdit(r.id)}
                  >
                    <td className="px-3 py-2">
                      <span className="text-blue-700 hover:underline">{r.productName}</span>
                      <span className="text-gray-400 text-xs ml-1">({r.productSku})</span>
                    </td>
                    <td className="px-3 py-2 text-gray-600">{r.name}</td>
                    <td className="px-3 py-2 text-right font-mono">{qtyFmt(r.outputQty)}</td>
                    <td className="px-3 py-2 text-right">{r.itemsCount}</td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </main>

      {ed && (
        <SpecEditor
          ed={ed}
          setEd={setEd}
          busy={busy}
          onSave={save}
          onArchive={archive}
          onClose={() => setEd(null)}
        />
      )}
    </div>
  );
}

function SpecEditor({
  ed,
  setEd,
  busy,
  onSave,
  onArchive,
  onClose,
}: {
  ed: Editor;
  setEd: (e: Editor) => void;
  busy: boolean;
  onSave: () => void;
  onArchive: () => void;
  onClose: () => void;
}) {
  function addMaterial(p: { id: string; name: string; sku: string; unit: string | null }) {
    if (ed.items.some((it) => it.materialProductId === p.id)) return;
    setEd({
      ...ed,
      items: [
        ...ed.items,
        { materialProductId: p.id, materialName: p.name, sku: p.sku, unit: p.unit, qty: "1" },
      ],
    });
  }
  function setItem(i: number, qty: string) {
    const items = ed.items.slice();
    items[i] = { ...items[i], qty };
    setEd({ ...ed, items });
  }
  function removeItem(i: number) {
    setEd({ ...ed, items: ed.items.filter((_, idx) => idx !== i) });
  }

  return (
    <div className="fixed inset-0 bg-black/40 flex items-start justify-center p-4 overflow-y-auto">
      <div className="bg-white rounded-lg shadow-lg w-full max-w-2xl mt-8 mb-10">
        <div className="px-4 py-3 border-b border-gray-200 flex items-center justify-between">
          <h3 className="font-semibold">
            {ed.id ? "Спецификация" : "Новая спецификация"}
          </h3>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-700">
            ✕
          </button>
        </div>

        <div className="p-4 space-y-3">
          {/* Изделие */}
          <div>
            <span className="text-xs text-gray-500 mb-1 block">Изделие (готовая продукция) *</span>
            {ed.productId ? (
              <div className="flex items-center gap-2 border border-gray-300 rounded px-3 py-1.5 text-sm">
                <span className="font-medium">{ed.productName}</span>
                <button
                  onClick={() => setEd({ ...ed, productId: "", productName: "" })}
                  className="ml-auto text-gray-400 hover:text-red-600 text-xs"
                >
                  сменить
                </button>
              </div>
            ) : (
              <SearchPicker
                placeholder="Поиск изделия по наименованию, артикулу…"
                onPick={(it) => setEd({ ...ed, productId: it.id, productName: it.label })}
              />
            )}
          </div>

          <div className="grid grid-cols-2 gap-3">
            <label className="block">
              <span className="text-xs text-gray-500 mb-1 block">Название спецификации</span>
              <input
                value={ed.name}
                onChange={(e) => setEd({ ...ed, name: e.target.value })}
                className="input"
              />
            </label>
            <label className="block">
              <span className="text-xs text-gray-500 mb-1 block">Выпуск (кол-во изделий)</span>
              <input
                value={ed.outputQty}
                onChange={(e) => setEd({ ...ed, outputQty: e.target.value })}
                className="input"
                inputMode="decimal"
              />
            </label>
          </div>

          {/* Материалы */}
          <div>
            <span className="text-xs text-gray-500 mb-1 block">Материалы (состав)</span>
            <div className="border border-gray-200 rounded overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="bg-gray-50 text-gray-500 text-left">
                  <tr>
                    <th className="px-2 py-1 font-medium">Материал</th>
                    <th className="px-2 py-1 font-medium w-28 text-right">Кол-во</th>
                    <th className="px-2 py-1 font-medium w-14">Ед.</th>
                    <th className="px-2 py-1 w-8"></th>
                  </tr>
                </thead>
                <tbody>
                  {ed.items.length === 0 ? (
                    <tr>
                      <td colSpan={4} className="px-2 py-3 text-center text-gray-400">
                        Нет материалов
                      </td>
                    </tr>
                  ) : (
                    ed.items.map((it, i) => (
                      <tr key={it.materialProductId} className="border-t border-gray-100">
                        <td className="px-2 py-1">
                          <span className="font-mono text-gray-400 text-xs">{it.sku}</span>{" "}
                          {it.materialName}
                        </td>
                        <td className="px-2 py-1">
                          <input
                            value={it.qty}
                            onChange={(e) => setItem(i, e.target.value)}
                            className="input text-right"
                            inputMode="decimal"
                          />
                        </td>
                        <td className="px-2 py-1 text-gray-500">{it.unit}</td>
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
                placeholder="+ Добавить материал (поиск по наименованию, артикулу…)"
                onPick={(it) =>
                  it.raw && addMaterial(it.raw)
                }
              />
            </div>
            <div className="text-xs text-gray-400 mt-1">
              Количество материала указывается на выпуск {qtyFmt(ed.outputQty)} ед. изделия.
            </div>
          </div>
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
              disabled={busy || !ed.productId || ed.items.length === 0}
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

type PickItem = {
  id: string;
  label: string;
  sub?: string;
  raw?: { id: string; name: string; sku: string; unit: string | null };
};

function SearchPicker({
  placeholder,
  onPick,
}: {
  placeholder: string;
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
        const r = await fetch(`/api/products?q=${encodeURIComponent(q.trim())}`);
        const j = await r.json();
        setResults(
          j.ok
            ? j.data.items.map(
                (p: { id: string; name: string; sku: string; unit: string | null }) => ({
                  id: p.id,
                  label: p.name,
                  sub: p.sku,
                  raw: p,
                })
              )
            : []
        );
        setOpen(true);
      } catch {
        setResults([]);
      }
    }, 300);
    return () => clearTimeout(t);
  }, [q]);

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
