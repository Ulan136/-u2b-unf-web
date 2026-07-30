"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";

type Item = {
  id: string;
  sku: string;
  name: string;
  oralName: string | null;
  name1c: string | null;
  unit: string | null;
  price: string | null;
  costPrice: string | null;
  minStock: string | null;
  isActive: boolean | null;
  ukanNomenId: string | null;
  qty: string;
  reserved: string;
};

type Movement = {
  id: string;
  moveType: string;
  qty: string;
  price: string | null;
  totalSum: string | null;
  docNo: string | null;
  comment: string | null;
  author: string | null;
  createdAt: string | null;
  productName: string;
  sku: string;
  warehouseName: string;
};

const MOVE_LABELS: Record<string, string> = {
  IN: "Приход",
  OUT: "Расход",
  ADJUST: "Инвентаризация",
  RESERVE: "Резерв",
  UNRESERVE: "Снятие резерва",
  TRANSFER: "Перемещение",
};

const UNITS = ["шт", "кг", "м", "м2", "м3", "л", "компл", "уп"];

function num(v: string | null | undefined) {
  const n = Number(v ?? 0);
  return Number.isFinite(n) ? n : 0;
}
function fmt(v: string | null | undefined) {
  return num(v).toLocaleString("ru-RU");
}

export default function WarehousePage() {
  const [items, setItems] = useState<Item[]>([]);
  const [movements, setMovements] = useState<Movement[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [search, setSearch] = useState("");

  const [productForm, setProductForm] = useState<null | {
    sku: string;
    name: string;
    unit: string;
    price: string;
    minStock: string;
    oralName: string;
    name1c: string;
  }>(null);

  const [moveForm, setMoveForm] = useState<null | {
    product: Item;
    moveType: string;
    qty: string;
    price: string;
    comment: string;
  }>(null);

  const [busy, setBusy] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const qs = search.trim() ? `?q=${encodeURIComponent(search.trim())}` : "";
      const res = await fetch(`/api/products${qs}`);
      const json = await res.json();
      if (!json.ok) throw new Error(json.error ?? "Ошибка загрузки");
      setItems(json.data.items);
      setMovements(json.data.movements);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Ошибка");
    } finally {
      setLoading(false);
    }
  }, [search]);

  useEffect(() => {
    const t = setTimeout(load, search ? 300 : 0);
    return () => clearTimeout(t);
  }, [load, search]);

  async function saveProduct() {
    if (!productForm) return;
    setBusy(true);
    setError(null);
    try {
      const res = await fetch("/api/products", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          sku: productForm.sku,
          name: productForm.name,
          unit: productForm.unit,
          price: productForm.price || "0",
          minStock: productForm.minStock || "0",
          oralName: productForm.oralName || undefined,
          name1c: productForm.name1c || undefined,
        }),
      });
      const json = await res.json();
      if (!json.ok) throw new Error(json.error ?? "Ошибка сохранения");
      setProductForm(null);
      await load();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Ошибка");
    } finally {
      setBusy(false);
    }
  }

  async function saveMove() {
    if (!moveForm) return;
    setBusy(true);
    setError(null);
    try {
      const res = await fetch("/api/stock/move", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          productId: moveForm.product.id,
          moveType: moveForm.moveType,
          qty: moveForm.qty,
          price: moveForm.price || "0",
          comment: moveForm.comment || undefined,
          author: "web",
        }),
      });
      const json = await res.json();
      if (!json.ok) throw new Error(json.error ?? "Ошибка движения");
      setMoveForm(null);
      await load();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Ошибка");
    } finally {
      setBusy(false);
    }
  }

  function openMove(product: Item, moveType: string) {
    setMoveForm({ product, moveType, qty: "", price: "", comment: "" });
  }

  return (
    <div className="min-h-screen">
      <header className="bg-yellow-400 text-gray-900 px-6 py-3 shadow flex items-center gap-4">
        <Link href="/" className="text-sm hover:underline">
          ← Главная
        </Link>
        <h1 className="text-lg font-semibold">Склад и остатки</h1>
      </header>

      <main className="max-w-6xl mx-auto p-4">
        <div className="flex flex-wrap items-center gap-2 mb-3">
          <button
            onClick={() =>
              setProductForm({
                sku: "",
                name: "",
                unit: "шт",
                price: "",
                minStock: "",
                oralName: "",
                name1c: "",
              })
            }
            className="bg-green-600 text-white px-3 py-1.5 rounded text-sm font-medium hover:bg-green-700"
          >
            + Товар
          </button>
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Поиск: наименование, артикул, устное, имя 1С…"
            className="ml-auto border border-gray-300 rounded px-3 py-1.5 text-sm w-80 max-w-full"
          />
        </div>

        {error && (
          <div className="bg-red-50 border border-red-200 text-red-700 text-sm rounded px-3 py-2 mb-3">
            {error}
          </div>
        )}

        {/* Номенклатура с остатками */}
        <div className="bg-white border border-gray-200 rounded-lg overflow-x-auto mb-6">
          <table className="w-full text-sm">
            <thead className="bg-gray-50 text-gray-600 text-left">
              <tr>
                <th className="px-3 py-2 font-medium">Артикул</th>
                <th className="px-3 py-2 font-medium">Наименование</th>
                <th className="px-3 py-2 font-medium">Ед.</th>
                <th className="px-3 py-2 font-medium text-right">Остаток</th>
                <th className="px-3 py-2 font-medium text-right">Резерв</th>
                <th className="px-3 py-2 font-medium text-right">Свободно</th>
                <th className="px-3 py-2 font-medium text-right">Цена</th>
                <th className="px-3 py-2 font-medium text-center">Движение</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr>
                  <td colSpan={8} className="px-3 py-6 text-center text-gray-400">
                    Загрузка…
                  </td>
                </tr>
              ) : items.length === 0 ? (
                <tr>
                  <td colSpan={8} className="px-3 py-6 text-center text-gray-400">
                    Нет номенклатуры. Нажмите «+ Товар».
                  </td>
                </tr>
              ) : (
                items.map((it) => {
                  const free = num(it.qty) - num(it.reserved);
                  return (
                    <tr
                      key={it.id}
                      className="border-t border-gray-100 hover:bg-yellow-50"
                    >
                      <td className="px-3 py-2 text-gray-500 font-mono">
                        {it.sku}
                      </td>
                      <td className="px-3 py-2">
                        {it.name}
                        {it.name1c && (
                          <span className="text-gray-400 text-xs block">
                            1С: {it.name1c}
                          </span>
                        )}
                      </td>
                      <td className="px-3 py-2 text-gray-500">{it.unit}</td>
                      <td className="px-3 py-2 text-right font-mono">
                        {fmt(it.qty)}
                      </td>
                      <td className="px-3 py-2 text-right font-mono text-gray-500">
                        {fmt(it.reserved)}
                      </td>
                      <td
                        className={`px-3 py-2 text-right font-mono ${
                          free <= 0 ? "text-red-600" : "text-green-700"
                        }`}
                      >
                        {free.toLocaleString("ru-RU")}
                      </td>
                      <td className="px-3 py-2 text-right font-mono">
                        {fmt(it.price)}
                      </td>
                      <td className="px-3 py-2">
                        <div className="flex gap-1 justify-center">
                          <button
                            onClick={() => openMove(it, "IN")}
                            title="Приход"
                            className="bg-green-100 text-green-700 w-7 h-7 rounded hover:bg-green-200 font-bold"
                          >
                            +
                          </button>
                          <button
                            onClick={() => openMove(it, "OUT")}
                            title="Расход"
                            className="bg-red-100 text-red-700 w-7 h-7 rounded hover:bg-red-200 font-bold"
                          >
                            −
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>

        {/* Лента движений */}
        <h2 className="text-sm font-bold text-gray-500 uppercase tracking-wide mb-2">
          Последние движения
        </h2>
        <div className="bg-white border border-gray-200 rounded-lg overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-gray-50 text-gray-600 text-left">
              <tr>
                <th className="px-3 py-2 font-medium">Дата</th>
                <th className="px-3 py-2 font-medium">Тип</th>
                <th className="px-3 py-2 font-medium">Номенклатура</th>
                <th className="px-3 py-2 font-medium text-right">Кол-во</th>
                <th className="px-3 py-2 font-medium">Комментарий</th>
                <th className="px-3 py-2 font-medium">Кто</th>
              </tr>
            </thead>
            <tbody>
              {movements.length === 0 ? (
                <tr>
                  <td colSpan={6} className="px-3 py-6 text-center text-gray-400">
                    Движений пока нет
                  </td>
                </tr>
              ) : (
                movements.map((m) => (
                  <tr key={m.id} className="border-t border-gray-100">
                    <td className="px-3 py-2 text-gray-500 whitespace-nowrap">
                      {m.createdAt
                        ? new Date(m.createdAt).toLocaleString("ru-RU")
                        : ""}
                    </td>
                    <td className="px-3 py-2">{MOVE_LABELS[m.moveType] ?? m.moveType}</td>
                    <td className="px-3 py-2">
                      <span className="font-mono text-gray-400 text-xs">
                        {m.sku}
                      </span>{" "}
                      {m.productName}
                    </td>
                    <td className="px-3 py-2 text-right font-mono">{fmt(m.qty)}</td>
                    <td className="px-3 py-2 text-gray-500">{m.comment}</td>
                    <td className="px-3 py-2 text-gray-500">{m.author}</td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </main>

      {/* Модалка: новый товар */}
      {productForm && (
        <Modal title="Новая номенклатура" onClose={() => setProductForm(null)}>
          <div className="grid grid-cols-2 gap-3">
            <Field label="Артикул *">
              <input
                autoFocus
                value={productForm.sku}
                onChange={(e) =>
                  setProductForm({ ...productForm, sku: e.target.value })
                }
                className="input"
              />
            </Field>
            <Field label="Единица">
              <select
                value={productForm.unit}
                onChange={(e) =>
                  setProductForm({ ...productForm, unit: e.target.value })
                }
                className="input"
              >
                {UNITS.map((u) => (
                  <option key={u}>{u}</option>
                ))}
              </select>
            </Field>
          </div>
          <Field label="Наименование *">
            <input
              value={productForm.name}
              onChange={(e) =>
                setProductForm({ ...productForm, name: e.target.value })
              }
              className="input"
            />
          </Field>
          <div className="grid grid-cols-2 gap-3">
            <Field label="Цена">
              <input
                value={productForm.price}
                onChange={(e) =>
                  setProductForm({ ...productForm, price: e.target.value })
                }
                className="input"
                inputMode="decimal"
              />
            </Field>
            <Field label="Мин. остаток">
              <input
                value={productForm.minStock}
                onChange={(e) =>
                  setProductForm({ ...productForm, minStock: e.target.value })
                }
                className="input"
                inputMode="decimal"
              />
            </Field>
          </div>
          <Field label="Устное название (как в Юкан)">
            <input
              value={productForm.oralName}
              onChange={(e) =>
                setProductForm({ ...productForm, oralName: e.target.value })
              }
              className="input"
            />
          </Field>
          <Field label="Имя как в 1С/УНФ (для сверки)">
            <input
              value={productForm.name1c}
              onChange={(e) =>
                setProductForm({ ...productForm, name1c: e.target.value })
              }
              className="input"
            />
          </Field>
          <ModalActions
            onCancel={() => setProductForm(null)}
            onSave={saveProduct}
            disabled={busy || !productForm.sku.trim() || !productForm.name.trim()}
            saving={busy}
          />
        </Modal>
      )}

      {/* Модалка: движение */}
      {moveForm && (
        <Modal
          title={`${MOVE_LABELS[moveForm.moveType]} — ${moveForm.product.name}`}
          onClose={() => setMoveForm(null)}
        >
          <Field label="Тип движения">
            <select
              value={moveForm.moveType}
              onChange={(e) =>
                setMoveForm({ ...moveForm, moveType: e.target.value })
              }
              className="input"
            >
              {Object.entries(MOVE_LABELS)
                .filter(([k]) => k !== "TRANSFER")
                .map(([k, v]) => (
                  <option key={k} value={k}>
                    {v}
                  </option>
                ))}
            </select>
          </Field>
          <div className="grid grid-cols-2 gap-3">
            <Field label="Количество *">
              <input
                autoFocus
                value={moveForm.qty}
                onChange={(e) =>
                  setMoveForm({ ...moveForm, qty: e.target.value })
                }
                className="input"
                inputMode="decimal"
              />
            </Field>
            <Field label="Цена">
              <input
                value={moveForm.price}
                onChange={(e) =>
                  setMoveForm({ ...moveForm, price: e.target.value })
                }
                className="input"
                inputMode="decimal"
              />
            </Field>
          </div>
          <Field label="Комментарий">
            <input
              value={moveForm.comment}
              onChange={(e) =>
                setMoveForm({ ...moveForm, comment: e.target.value })
              }
              className="input"
            />
          </Field>
          <div className="text-xs text-gray-500">
            Текущий остаток: {fmt(moveForm.product.qty)} {moveForm.product.unit},
            свободно {num(moveForm.product.qty) - num(moveForm.product.reserved)}
          </div>
          <ModalActions
            onCancel={() => setMoveForm(null)}
            onSave={saveMove}
            disabled={busy || !moveForm.qty.trim()}
            saving={busy}
          />
        </Modal>
      )}
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
      <div className="bg-white rounded-lg shadow-lg w-full max-w-lg mt-10">
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

function ModalActions({
  onCancel,
  onSave,
  disabled,
  saving,
}: {
  onCancel: () => void;
  onSave: () => void;
  disabled: boolean;
  saving: boolean;
}) {
  return (
    <div className="flex justify-end gap-2 pt-2">
      <button
        onClick={onCancel}
        className="px-3 py-1.5 rounded text-sm border border-gray-300 hover:bg-gray-50"
      >
        Отмена
      </button>
      <button
        onClick={onSave}
        disabled={disabled}
        className="px-4 py-1.5 rounded text-sm bg-green-600 text-white font-medium hover:bg-green-700 disabled:opacity-50"
      >
        {saving ? "Сохранение…" : "Записать"}
      </button>
    </div>
  );
}

function Field({
  label,
  children,
}: {
  label: string;
  children: React.ReactNode;
}) {
  return (
    <label className="block">
      <span className="text-xs text-gray-500 mb-1 block">{label}</span>
      {children}
    </label>
  );
}
