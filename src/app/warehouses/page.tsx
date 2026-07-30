"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";

type Warehouse = {
  id: string;
  code: string;
  name: string;
  address: string | null;
  isDefault: boolean | null;
  isActive: boolean | null;
};

type Form = {
  id?: string;
  code: string;
  name: string;
  address: string;
  isDefault: boolean;
};

export default function WarehousesPage() {
  const [items, setItems] = useState<Warehouse[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [form, setForm] = useState<Form | null>(null);
  const [busy, setBusy] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch("/api/warehouses");
      const json = await res.json();
      if (!json.ok) throw new Error(json.error ?? "Ошибка");
      setItems(json.data);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Ошибка");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  function openNew() {
    setForm({ code: "", name: "", address: "", isDefault: false });
  }
  function openEdit(w: Warehouse) {
    setForm({
      id: w.id,
      code: w.code,
      name: w.name,
      address: w.address ?? "",
      isDefault: !!w.isDefault,
    });
  }

  async function save() {
    if (!form) return;
    setBusy(true);
    setError(null);
    try {
      const res = await fetch(
        form.id ? `/api/warehouses/${form.id}` : "/api/warehouses",
        {
          method: form.id ? "PATCH" : "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            code: form.code,
            name: form.name,
            address: form.address || null,
            isDefault: form.isDefault,
          }),
        }
      );
      const json = await res.json();
      if (!json.ok) throw new Error(json.error ?? "Ошибка");
      setForm(null);
      await load();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Ошибка");
    } finally {
      setBusy(false);
    }
  }

  async function archive() {
    if (!form?.id) return;
    if (!confirm(`Удалить склад «${form.name}»?`)) return;
    setBusy(true);
    setError(null);
    try {
      const res = await fetch(`/api/warehouses/${form.id}`, { method: "DELETE" });
      const json = await res.json();
      if (!json.ok) throw new Error(json.error ?? "Ошибка");
      setForm(null);
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
        <h1 className="text-lg font-semibold">Склады</h1>
      </header>

      <main className="max-w-4xl mx-auto p-4">
        <div className="mb-3">
          <button
            onClick={openNew}
            className="bg-green-600 text-white px-3 py-1.5 rounded text-sm font-medium hover:bg-green-700"
          >
            + Склад
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
                <th className="px-3 py-2 font-medium">Код</th>
                <th className="px-3 py-2 font-medium">Наименование</th>
                <th className="px-3 py-2 font-medium">Адрес</th>
                <th className="px-3 py-2 font-medium">Основной</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr>
                  <td colSpan={4} className="px-3 py-6 text-center text-gray-400">
                    Загрузка…
                  </td>
                </tr>
              ) : items.length === 0 ? (
                <tr>
                  <td colSpan={4} className="px-3 py-6 text-center text-gray-400">
                    Складов нет. Нажмите «+ Склад».
                  </td>
                </tr>
              ) : (
                items.map((w) => (
                  <tr
                    key={w.id}
                    className="border-t border-gray-100 hover:bg-yellow-50 cursor-pointer"
                    onClick={() => openEdit(w)}
                  >
                    <td className="px-3 py-2 font-mono text-gray-500">{w.code}</td>
                    <td className="px-3 py-2 text-blue-700 hover:underline">
                      {w.name}
                    </td>
                    <td className="px-3 py-2 text-gray-500">{w.address}</td>
                    <td className="px-3 py-2">
                      {w.isDefault && (
                        <span className="text-xs bg-yellow-200 text-gray-800 px-2 py-0.5 rounded">
                          основной
                        </span>
                      )}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </main>

      {form && (
        <div className="fixed inset-0 bg-black/40 flex items-start justify-center p-4 overflow-y-auto">
          <div className="bg-white rounded-lg shadow-lg w-full max-w-md mt-10">
            <div className="px-4 py-3 border-b border-gray-200 flex items-center justify-between">
              <h3 className="font-semibold">{form.id ? "Склад" : "Новый склад"}</h3>
              <button
                onClick={() => setForm(null)}
                className="text-gray-400 hover:text-gray-700"
              >
                ✕
              </button>
            </div>
            <div className="p-4 space-y-3">
              <label className="block">
                <span className="text-xs text-gray-500 mb-1 block">Код *</span>
                <input
                  autoFocus={!form.id}
                  value={form.code}
                  onChange={(e) => setForm({ ...form, code: e.target.value })}
                  className="input"
                />
              </label>
              <label className="block">
                <span className="text-xs text-gray-500 mb-1 block">Наименование *</span>
                <input
                  value={form.name}
                  onChange={(e) => setForm({ ...form, name: e.target.value })}
                  className="input"
                />
              </label>
              <label className="block">
                <span className="text-xs text-gray-500 mb-1 block">Адрес</span>
                <input
                  value={form.address}
                  onChange={(e) => setForm({ ...form, address: e.target.value })}
                  className="input"
                />
              </label>
              <label className="flex items-center gap-2 text-sm">
                <input
                  type="checkbox"
                  checked={form.isDefault}
                  onChange={(e) => setForm({ ...form, isDefault: e.target.checked })}
                />
                Основной склад (по умолчанию)
              </label>
            </div>
            <div className="px-4 py-3 border-t border-gray-200 flex items-center gap-2">
              {form.id && (
                <button
                  onClick={archive}
                  disabled={busy}
                  className="px-3 py-1.5 rounded text-sm text-red-600 border border-red-200 hover:bg-red-50 disabled:opacity-50"
                >
                  Удалить
                </button>
              )}
              <div className="ml-auto flex gap-2">
                <button
                  onClick={() => setForm(null)}
                  className="px-3 py-1.5 rounded text-sm border border-gray-300 hover:bg-gray-50"
                >
                  Отмена
                </button>
                <button
                  onClick={save}
                  disabled={busy || !form.code.trim() || !form.name.trim()}
                  className="px-4 py-1.5 rounded text-sm bg-green-600 text-white font-medium hover:bg-green-700 disabled:opacity-50"
                >
                  {busy ? "Сохранение…" : "Записать"}
                </button>
              </div>
            </div>
          </div>
        </div>
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
