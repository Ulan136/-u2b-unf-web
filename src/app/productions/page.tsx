"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";

type ProdRow = {
  id: string;
  seq: number;
  prodDate: string | null;
  status: string;
  qty: string;
  cost: string | null;
  producedAt: string | null;
  productName: string;
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
  seq?: number;
  prodDate: string;
  productId: string;
  productName: string;
  qty: string;
  warehouseId: string;
  status: string;
  comment: string;
  items: MatItem[];
  producedAt: string | null;
};

type Spec = {
  id: string;
  name: string;
  outputQty: string;
  productId: string;
};

const STATUSES = ["Новый", "В работе", "Выполнен", "Отменён"];

function num(v: string | null | undefined) {
  const n = Number(v ?? 0);
  return Number.isFinite(n) ? n : 0;
}
function money(v: string | number | null | undefined) {
  return num(v as string).toLocaleString("ru-RU", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}
function qtyFmt(v: string | number | null | undefined) {
  return num(v as string).toLocaleString("ru-RU");
}
function docNo(seq?: number) {
  return seq ? `ПР-${String(seq).padStart(5, "0")}` : "новый";
}
function today() {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(
    d.getDate()
  ).padStart(2, "0")}`;
}

export default function ProductionsPage() {
  const [rows, setRows] = useState<ProdRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [warehouses, setWarehouses] = useState<{ id: string; name: string }[]>([]);
  const [specs, setSpecs] = useState<Spec[]>([]);
  const [ed, setEd] = useState<Editor | null>(null);
  const [busy, setBusy] = useState(false);

  const loadList = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch("/api/productions");
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
    fetch("/api/warehouses").then((r) => r.json()).then((j) => j.ok && setWarehouses(j.data)).catch(() => {});
    fetch("/api/specifications").then((r) => r.json()).then((j) => j.ok && setSpecs(j.data)).catch(() => {});
  }, [loadList]);

  function openNew() {
    setEd({
      prodDate: today(),
      productId: "",
      productName: "",
      qty: "1",
      warehouseId: "",
      status: "Новый",
      comment: "",
      items: [],
      producedAt: null,
    });
  }

  async function openEdit(id: string) {
    setError(null);
    try {
      const res = await fetch(`/api/productions/${id}`);
      const json = await res.json();
      if (!json.ok) throw new Error(json.error ?? "Ошибка");
      const { production, items } = json.data;
      setEd({
        id: production.id,
        seq: production.seq,
        prodDate: production.prodDate ? String(production.prodDate).slice(0, 10) : today(),
        productId: production.productId,
        productName: production.productName,
        qty: production.qty,
        warehouseId: production.warehouseId ?? "",
        status: production.status,
        comment: production.comment ?? "",
        producedAt: production.producedAt ?? null,
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
        prodDate: ed.prodDate || undefined,
        productId: ed.productId,
        qty: ed.qty || "1",
        warehouseId: ed.warehouseId || null,
        status: ed.status,
        comment: ed.comment || null,
        items: ed.items.map((it) => ({ materialProductId: it.materialProductId, qty: it.qty || "0" })),
      };
      const res = await fetch(ed.id ? `/api/productions/${ed.id}` : "/api/productions", {
        method: ed.id ? "PATCH" : "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
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
    if (!confirm(`Пометить на удаление документ ${docNo(ed.seq)}?`)) return;
    setBusy(true);
    try {
      const res = await fetch(`/api/productions/${ed.id}`, { method: "DELETE" });
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

  async function produce() {
    if (!ed?.id) return;
    if (!confirm("Провести производство? Материалы спишутся со склада, изделие оприходуется. Действие необратимо.")) return;
    setBusy(true);
    setError(null);
    const pid = ed.id;
    try {
      const res = await fetch(`/api/productions/${pid}/produce`, { method: "POST" });
      const json = await res.json();
      if (!json.ok) throw new Error(json.error ?? "Ошибка производства");
      await openEdit(pid);
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
        <Link href="/" className="text-sm hover:underline">← Главная</Link>
        <h1 className="text-lg font-semibold">Производство</h1>
        <Link href="/specifications" className="ml-auto text-sm hover:underline">Спецификации →</Link>
      </header>

      <main className="max-w-6xl mx-auto p-4">
        <div className="mb-3">
          <button onClick={openNew} className="bg-green-600 text-white px-3 py-1.5 rounded text-sm font-medium hover:bg-green-700">
            + Производство
          </button>
        </div>

        {error && <div className="bg-red-50 border border-red-200 text-red-700 text-sm rounded px-3 py-2 mb-3">{error}</div>}

        <div className="bg-white border border-gray-200 rounded-lg overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-gray-50 text-gray-600 text-left">
              <tr>
                <th className="px-3 py-2 font-medium">Номер</th>
                <th className="px-3 py-2 font-medium">Дата</th>
                <th className="px-3 py-2 font-medium">Изделие</th>
                <th className="px-3 py-2 font-medium text-right">Кол-во</th>
                <th className="px-3 py-2 font-medium">Статус</th>
                <th className="px-3 py-2 font-medium text-right">Себестоимость</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr><td colSpan={6} className="px-3 py-6 text-center text-gray-400">Загрузка…</td></tr>
              ) : rows.length === 0 ? (
                <tr><td colSpan={6} className="px-3 py-6 text-center text-gray-400">Документов нет. Нажмите «+ Производство».</td></tr>
              ) : (
                rows.map((o) => (
                  <tr key={o.id} className="border-t border-gray-100 hover:bg-yellow-50 cursor-pointer" onClick={() => openEdit(o.id)}>
                    <td className="px-3 py-2 font-mono text-blue-700">{docNo(o.seq)}</td>
                    <td className="px-3 py-2 text-gray-500">{o.prodDate ? String(o.prodDate).slice(0, 10) : ""}</td>
                    <td className="px-3 py-2">{o.productName}</td>
                    <td className="px-3 py-2 text-right font-mono">{qtyFmt(o.qty)}</td>
                    <td className="px-3 py-2"><StatusBadge status={o.status} /></td>
                    <td className="px-3 py-2 text-right font-mono">{o.producedAt ? money(o.cost) : "—"}</td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </main>

      {ed && (
        <ProdEditor
          ed={ed}
          setEd={setEd}
          warehouses={warehouses}
          specs={specs}
          busy={busy}
          onSave={save}
          onArchive={archive}
          onProduce={produce}
          onClose={() => setEd(null)}
        />
      )}
    </div>
  );
}

function StatusBadge({ status }: { status: string }) {
  const color = status === "Выполнен" ? "bg-green-100 text-green-700" : status === "Отменён" ? "bg-gray-200 text-gray-500" : status === "В работе" ? "bg-blue-100 text-blue-700" : "bg-yellow-100 text-yellow-800";
  return <span className={`text-xs px-2 py-0.5 rounded ${color}`}>{status}</span>;
}

function ProdEditor({
  ed, setEd, warehouses, specs, busy, onSave, onArchive, onProduce, onClose,
}: {
  ed: Editor;
  setEd: (e: Editor) => void;
  warehouses: { id: string; name: string }[];
  specs: Spec[];
  busy: boolean;
  onSave: () => void;
  onArchive: () => void;
  onProduce: () => void;
  onClose: () => void;
}) {
  const produced = !!ed.producedAt;
  const [specId, setSpecId] = useState("");
  const specsForProduct = specs.filter((s) => s.productId === ed.productId);

  async function fillFromSpec() {
    if (!specId) return;
    const res = await fetch(`/api/specifications/${specId}`);
    const json = await res.json();
    if (!json.ok) return;
    const outputQty = num(json.data.spec.outputQty) || 1;
    const ratio = num(ed.qty) / outputQty;
    const items: MatItem[] = json.data.items.map((it: MatItem) => ({
      materialProductId: it.materialProductId,
      materialName: it.materialName,
      sku: it.sku,
      unit: it.unit,
      qty: String(+(num(it.qty) * ratio).toFixed(3)),
    }));
    setEd({ ...ed, items });
  }

  function addMaterial(p: { id: string; name: string; sku: string; unit: string | null }) {
    if (ed.items.some((it) => it.materialProductId === p.id)) return;
    setEd({ ...ed, items: [...ed.items, { materialProductId: p.id, materialName: p.name, sku: p.sku, unit: p.unit, qty: "1" }] });
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
      <div className="bg-white rounded-lg shadow-lg w-full max-w-3xl mt-6 mb-10">
        <div className="px-4 py-3 border-b border-gray-200 flex items-center justify-between">
          <h3 className="font-semibold">Производство {docNo(ed.seq)}</h3>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-700">✕</button>
        </div>

        <div className="p-4 space-y-3">
          {produced && (
            <div className="bg-green-50 border border-green-200 text-green-800 text-sm rounded px-3 py-2">
              ✓ Проведено {String(ed.producedAt).slice(0, 10)} — материалы списаны, изделие оприходовано. Редактирование недоступно.
            </div>
          )}

          <div>
            <span className="text-xs text-gray-500 mb-1 block">Изделие (готовая продукция) *</span>
            {ed.productId ? (
              <div className="flex items-center gap-2 border border-gray-300 rounded px-3 py-1.5 text-sm">
                <span className="font-medium">{ed.productName}</span>
                {!produced && (
                  <button onClick={() => setEd({ ...ed, productId: "", productName: "" })} className="ml-auto text-gray-400 hover:text-red-600 text-xs">сменить</button>
                )}
              </div>
            ) : (
              <SearchPicker placeholder="Поиск изделия…" onPick={(it) => setEd({ ...ed, productId: it.id, productName: it.label })} />
            )}
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            <label className="block">
              <span className="text-xs text-gray-500 mb-1 block">Кол-во выпуска *</span>
              <input value={ed.qty} onChange={(e) => setEd({ ...ed, qty: e.target.value })} className="input" inputMode="decimal" disabled={produced} />
            </label>
            <label className="block">
              <span className="text-xs text-gray-500 mb-1 block">Дата</span>
              <input type="date" value={ed.prodDate} onChange={(e) => setEd({ ...ed, prodDate: e.target.value })} className="input" disabled={produced} />
            </label>
            <label className="block">
              <span className="text-xs text-gray-500 mb-1 block">Статус</span>
              <select value={ed.status} onChange={(e) => setEd({ ...ed, status: e.target.value })} className="input" disabled={produced}>
                {STATUSES.map((s) => <option key={s}>{s}</option>)}
              </select>
            </label>
            <label className="block">
              <span className="text-xs text-gray-500 mb-1 block">Склад</span>
              <select value={ed.warehouseId} onChange={(e) => setEd({ ...ed, warehouseId: e.target.value })} className="input" disabled={produced}>
                <option value="">— основной —</option>
                {warehouses.map((w) => <option key={w.id} value={w.id}>{w.name}</option>)}
              </select>
            </label>
          </div>

          {/* Заполнение по спецификации */}
          {!produced && ed.productId && specsForProduct.length > 0 && (
            <div className="flex items-center gap-2 bg-gray-50 border border-gray-200 rounded px-3 py-2">
              <span className="text-xs text-gray-500">Спецификация:</span>
              <select value={specId} onChange={(e) => setSpecId(e.target.value)} className="input flex-1">
                <option value="">— выберите —</option>
                {specsForProduct.map((s) => <option key={s.id} value={s.id}>{s.name} (выпуск {qtyFmt(s.outputQty)})</option>)}
              </select>
              <button onClick={fillFromSpec} disabled={!specId} className="px-3 py-1.5 rounded text-sm bg-blue-600 text-white hover:bg-blue-700 disabled:opacity-50 whitespace-nowrap">
                Заполнить
              </button>
            </div>
          )}

          {/* Материалы */}
          <div>
            <span className="text-xs text-gray-500 mb-1 block">Материалы (списываются со склада)</span>
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
                    <tr><td colSpan={4} className="px-2 py-3 text-center text-gray-400">Нет материалов</td></tr>
                  ) : (
                    ed.items.map((it, i) => (
                      <tr key={it.materialProductId} className="border-t border-gray-100">
                        <td className="px-2 py-1"><span className="font-mono text-gray-400 text-xs">{it.sku}</span> {it.materialName}</td>
                        <td className="px-2 py-1"><input value={it.qty} disabled={produced} onChange={(e) => setItem(i, e.target.value)} className="input text-right" inputMode="decimal" /></td>
                        <td className="px-2 py-1 text-gray-500">{it.unit}</td>
                        <td className="px-2 py-1 text-center">{!produced && <button onClick={() => removeItem(i)} className="text-gray-400 hover:text-red-600">✕</button>}</td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
            {!produced && (
              <div className="mt-2">
                <SearchPicker placeholder="+ Добавить материал…" onPick={(it) => it.raw && addMaterial(it.raw)} />
              </div>
            )}
          </div>

          <label className="block">
            <span className="text-xs text-gray-500 mb-1 block">Комментарий</span>
            <input value={ed.comment} onChange={(e) => setEd({ ...ed, comment: e.target.value })} className="input" disabled={produced} />
          </label>
        </div>

        <div className="px-4 py-3 border-t border-gray-200 flex items-center gap-2 flex-wrap">
          {ed.id && !produced && (
            <button onClick={onArchive} disabled={busy} className="px-3 py-1.5 rounded text-sm text-red-600 border border-red-200 hover:bg-red-50 disabled:opacity-50">Пометить на удаление</button>
          )}
          {ed.id && !produced && (
            <button onClick={onProduce} disabled={busy || ed.items.length === 0} className="px-3 py-1.5 rounded text-sm bg-orange-500 text-white font-medium hover:bg-orange-600 disabled:opacity-50" title="Списать материалы и оприходовать изделие">
              🏭 Произвести
            </button>
          )}
          <div className="ml-auto flex gap-2">
            <button onClick={onClose} className="px-3 py-1.5 rounded text-sm border border-gray-300 hover:bg-gray-50">{produced ? "Закрыть" : "Отмена"}</button>
            {!produced && (
              <button onClick={onSave} disabled={busy || !ed.productId || ed.items.length === 0} className="px-4 py-1.5 rounded text-sm bg-green-600 text-white font-medium hover:bg-green-700 disabled:opacity-50">
                {busy ? "Сохранение…" : "Записать"}
              </button>
            )}
          </div>
        </div>
      </div>

      <style jsx global>{`
        .input { width: 100%; border: 1px solid #d1d5db; border-radius: 0.375rem; padding: 0.375rem 0.5rem; font-size: 0.875rem; }
        .input:disabled { background: #f3f4f6; color: #6b7280; }
      `}</style>
    </div>
  );
}

type PickItem = { id: string; label: string; sub?: string; raw?: { id: string; name: string; sku: string; unit: string | null } };

function SearchPicker({ placeholder, onPick }: { placeholder: string; onPick: (it: PickItem) => void }) {
  const [q, setQ] = useState("");
  const [results, setResults] = useState<PickItem[]>([]);
  const [open, setOpen] = useState(false);

  useEffect(() => {
    if (!q.trim()) { setResults([]); return; }
    const t = setTimeout(async () => {
      try {
        const r = await fetch(`/api/products?q=${encodeURIComponent(q.trim())}`);
        const j = await r.json();
        setResults(j.ok ? j.data.items.map((p: { id: string; name: string; sku: string; unit: string | null }) => ({ id: p.id, label: p.name, sub: p.sku, raw: p })) : []);
        setOpen(true);
      } catch { setResults([]); }
    }, 300);
    return () => clearTimeout(t);
  }, [q]);

  return (
    <div className="relative">
      <input value={q} onChange={(e) => setQ(e.target.value)} onFocus={() => results.length && setOpen(true)} placeholder={placeholder} className="input" />
      {open && results.length > 0 && (
        <div className="absolute z-10 left-0 right-0 bg-white border border-gray-200 rounded shadow-lg mt-1 max-h-64 overflow-y-auto">
          {results.map((it) => (
            <button key={it.id} onClick={() => { onPick(it); setQ(""); setResults([]); setOpen(false); }} className="block w-full text-left px-3 py-2 text-sm hover:bg-yellow-50 border-b border-gray-50">
              {it.label}{it.sub && <span className="text-gray-400 text-xs ml-2">{it.sub}</span>}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
