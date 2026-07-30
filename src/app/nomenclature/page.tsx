"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";

type Group = {
  id: string;
  code: string | null;
  name: string;
  parentId: string | null;
};

type Product = {
  id: string;
  sku: string;
  name: string;
  name1c: string | null;
  groupId: string | null;
  unit: string | null;
  price: string | null;
  qty: string;
  reserved: string;
};

const UNITS = ["шт", "кг", "м", "м2", "м3", "л", "компл", "уп"];

function fmt(v: string | null | undefined) {
  const n = Number(v ?? 0);
  return (Number.isFinite(n) ? n : 0).toLocaleString("ru-RU");
}

export default function NomenclaturePage() {
  const [groups, setGroups] = useState<Group[]>([]);
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [search, setSearch] = useState("");
  // «хлебные крошки» по папкам
  const [path, setPath] = useState<{ id: string; name: string }[]>([]);

  const [groupForm, setGroupForm] = useState<null | { name: string }>(null);
  const [productForm, setProductForm] = useState<null | {
    sku: string;
    name: string;
    unit: string;
    price: string;
    name1c: string;
  }>(null);
  const [busy, setBusy] = useState(false);

  const currentGroupId = path.length ? path[path.length - 1].id : null;

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const qs = new URLSearchParams();
      if (search.trim()) qs.set("q", search.trim());
      else if (currentGroupId) qs.set("groupId", currentGroupId);
      const res = await fetch(`/api/nomenclature?${qs.toString()}`);
      const json = await res.json();
      if (!json.ok) throw new Error(json.error ?? "Ошибка загрузки");
      setGroups(json.data.groups);
      setProducts(json.data.products);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Ошибка");
    } finally {
      setLoading(false);
    }
  }, [search, currentGroupId]);

  useEffect(() => {
    const t = setTimeout(load, search ? 300 : 0);
    return () => clearTimeout(t);
  }, [load, search]);

  async function saveGroup() {
    if (!groupForm) return;
    setBusy(true);
    setError(null);
    try {
      const res = await fetch("/api/product-groups", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: groupForm.name,
          parentId: currentGroupId,
        }),
      });
      const json = await res.json();
      if (!json.ok) throw new Error(json.error ?? "Ошибка");
      setGroupForm(null);
      await load();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Ошибка");
    } finally {
      setBusy(false);
    }
  }

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
          name1c: productForm.name1c || undefined,
          groupId: currentGroupId ?? undefined,
        }),
      });
      const json = await res.json();
      if (!json.ok) throw new Error(json.error ?? "Ошибка");
      setProductForm(null);
      await load();
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
        <h1 className="text-lg font-semibold">Номенклатура</h1>
        <Link href="/warehouse" className="ml-auto text-sm hover:underline">
          Склад и остатки →
        </Link>
      </header>

      <main className="max-w-6xl mx-auto p-4">
        <div className="flex flex-wrap items-center gap-2 mb-3">
          <button
            onClick={() => setProductForm({ sku: "", name: "", unit: "шт", price: "", name1c: "" })}
            className="bg-green-600 text-white px-3 py-1.5 rounded text-sm font-medium hover:bg-green-700"
          >
            + Товар/услуга
          </button>
          <button
            onClick={() => setGroupForm({ name: "" })}
            className="bg-blue-600 text-white px-3 py-1.5 rounded text-sm font-medium hover:bg-blue-700"
          >
            + Группа
          </button>
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Поиск: наименование, артикул, имя 1С…"
            className="ml-auto border border-gray-300 rounded px-3 py-1.5 text-sm w-72 max-w-full"
          />
        </div>

        {/* Хлебные крошки */}
        <div className="text-sm text-gray-600 mb-2 flex flex-wrap items-center gap-1">
          <button onClick={() => setPath([])} className="hover:underline text-blue-700">
            Номенклатура
          </button>
          {path.map((p, i) => (
            <span key={p.id} className="flex items-center gap-1">
              <span>/</span>
              <button
                onClick={() => setPath(path.slice(0, i + 1))}
                className="hover:underline text-blue-700"
              >
                {p.name}
              </button>
            </span>
          ))}
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
                <th className="px-3 py-2 font-medium">Наименование</th>
                <th className="px-3 py-2 font-medium">Артикул</th>
                <th className="px-3 py-2 font-medium">Ед.</th>
                <th className="px-3 py-2 font-medium text-right">Остаток</th>
                <th className="px-3 py-2 font-medium text-right">Цена</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr>
                  <td colSpan={5} className="px-3 py-6 text-center text-gray-400">
                    Загрузка…
                  </td>
                </tr>
              ) : groups.length === 0 && products.length === 0 ? (
                <tr>
                  <td colSpan={5} className="px-3 py-6 text-center text-gray-400">
                    Пусто. Создайте группу или товар.
                  </td>
                </tr>
              ) : (
                <>
                  {groups.map((g) => (
                    <tr
                      key={g.id}
                      className="border-t border-gray-100 hover:bg-yellow-50 cursor-pointer"
                      onClick={() => {
                        setPath([...path, { id: g.id, name: g.name }]);
                        setSearch("");
                      }}
                    >
                      <td className="px-3 py-2 font-medium">📁 {g.name}</td>
                      <td className="px-3 py-2 text-gray-400">{g.code}</td>
                      <td className="px-3 py-2" colSpan={3}></td>
                    </tr>
                  ))}
                  {products.map((p) => (
                    <tr key={p.id} className="border-t border-gray-100 hover:bg-yellow-50">
                      <td className="px-3 py-2">
                        {p.name}
                        {p.name1c && (
                          <span className="text-gray-400 text-xs block">
                            1С: {p.name1c}
                          </span>
                        )}
                      </td>
                      <td className="px-3 py-2 text-gray-500 font-mono">{p.sku}</td>
                      <td className="px-3 py-2 text-gray-500">{p.unit}</td>
                      <td className="px-3 py-2 text-right font-mono">{fmt(p.qty)}</td>
                      <td className="px-3 py-2 text-right font-mono">{fmt(p.price)}</td>
                    </tr>
                  ))}
                </>
              )}
            </tbody>
          </table>
        </div>
      </main>

      {/* Модалка группы */}
      {groupForm && (
        <Modal title="Новая группа" onClose={() => setGroupForm(null)}>
          <Field label="Название группы *">
            <input
              autoFocus
              value={groupForm.name}
              onChange={(e) => setGroupForm({ name: e.target.value })}
              className="input"
            />
          </Field>
          <Actions
            onCancel={() => setGroupForm(null)}
            onSave={saveGroup}
            disabled={busy || !groupForm.name.trim()}
            saving={busy}
          />
        </Modal>
      )}

      {/* Модалка товара */}
      {productForm && (
        <Modal title="Новая номенклатура" onClose={() => setProductForm(null)}>
          <div className="grid grid-cols-2 gap-3">
            <Field label="Артикул *">
              <input
                autoFocus
                value={productForm.sku}
                onChange={(e) => setProductForm({ ...productForm, sku: e.target.value })}
                className="input"
              />
            </Field>
            <Field label="Единица">
              <select
                value={productForm.unit}
                onChange={(e) => setProductForm({ ...productForm, unit: e.target.value })}
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
              onChange={(e) => setProductForm({ ...productForm, name: e.target.value })}
              className="input"
            />
          </Field>
          <div className="grid grid-cols-2 gap-3">
            <Field label="Цена">
              <input
                value={productForm.price}
                onChange={(e) => setProductForm({ ...productForm, price: e.target.value })}
                className="input"
                inputMode="decimal"
              />
            </Field>
            <Field label="Имя как в 1С (для сверки)">
              <input
                value={productForm.name1c}
                onChange={(e) => setProductForm({ ...productForm, name1c: e.target.value })}
                className="input"
              />
            </Field>
          </div>
          <div className="text-xs text-gray-500">
            Будет создан в папке:{" "}
            <b>{path.length ? path[path.length - 1].name : "Номенклатура (корень)"}</b>
          </div>
          <Actions
            onCancel={() => setProductForm(null)}
            onSave={saveProduct}
            disabled={busy || !productForm.sku.trim() || !productForm.name.trim()}
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

function Actions({
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

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <label className="block">
      <span className="text-xs text-gray-500 mb-1 block">{label}</span>
      {children}
    </label>
  );
}
