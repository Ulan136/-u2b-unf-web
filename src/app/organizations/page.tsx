"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";

type Organization = {
  id: string;
  name: string;
  fullName: string | null;
  bin: string | null;
  address: string | null;
  phone: string | null;
  email: string | null;
  director: string | null;
  bankName: string | null;
  bankAccount: string | null;
  bankBik: string | null;
  isDefault: boolean | null;
};

type Form = {
  id?: string;
  name: string;
  fullName: string;
  bin: string;
  address: string;
  phone: string;
  email: string;
  director: string;
  bankName: string;
  bankAccount: string;
  bankBik: string;
  isDefault: boolean;
};

function emptyForm(): Form {
  return {
    name: "",
    fullName: "",
    bin: "",
    address: "",
    phone: "",
    email: "",
    director: "",
    bankName: "",
    bankAccount: "",
    bankBik: "",
    isDefault: false,
  };
}

export default function OrganizationsPage() {
  const [items, setItems] = useState<Organization[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [form, setForm] = useState<Form | null>(null);
  const [busy, setBusy] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch("/api/organizations");
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

  function openEdit(o: Organization) {
    setForm({
      id: o.id,
      name: o.name,
      fullName: o.fullName ?? "",
      bin: o.bin ?? "",
      address: o.address ?? "",
      phone: o.phone ?? "",
      email: o.email ?? "",
      director: o.director ?? "",
      bankName: o.bankName ?? "",
      bankAccount: o.bankAccount ?? "",
      bankBik: o.bankBik ?? "",
      isDefault: !!o.isDefault,
    });
  }

  async function save() {
    if (!form) return;
    setBusy(true);
    setError(null);
    const v = (s: string) => (s && s.trim() ? s.trim() : form.id ? null : undefined);
    try {
      const payload = {
        name: form.name,
        fullName: v(form.fullName),
        bin: v(form.bin),
        address: v(form.address),
        phone: v(form.phone),
        email: v(form.email),
        director: v(form.director),
        bankName: v(form.bankName),
        bankAccount: v(form.bankAccount),
        bankBik: v(form.bankBik),
        isDefault: form.isDefault,
      };
      const res = await fetch(
        form.id ? `/api/organizations/${form.id}` : "/api/organizations",
        {
          method: form.id ? "PATCH" : "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(payload),
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
    if (!confirm(`Пометить на удаление «${form.name}»?`)) return;
    setBusy(true);
    try {
      const res = await fetch(`/api/organizations/${form.id}`, { method: "DELETE" });
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
        <h1 className="text-lg font-semibold">Организации</h1>
      </header>

      <main className="max-w-4xl mx-auto p-4">
        <div className="mb-3">
          <button
            onClick={() => setForm(emptyForm())}
            className="bg-green-600 text-white px-3 py-1.5 rounded text-sm font-medium hover:bg-green-700"
          >
            + Организация
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
                <th className="px-3 py-2 font-medium">Наименование</th>
                <th className="px-3 py-2 font-medium">БИН/ИИН</th>
                <th className="px-3 py-2 font-medium">Руководитель</th>
                <th className="px-3 py-2 font-medium">Основная</th>
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
                    Организаций нет. Нажмите «+ Организация».
                  </td>
                </tr>
              ) : (
                items.map((o) => (
                  <tr
                    key={o.id}
                    className="border-t border-gray-100 hover:bg-yellow-50 cursor-pointer"
                    onClick={() => openEdit(o)}
                  >
                    <td className="px-3 py-2 text-blue-700 hover:underline">{o.name}</td>
                    <td className="px-3 py-2 font-mono text-gray-500">{o.bin}</td>
                    <td className="px-3 py-2 text-gray-500">{o.director}</td>
                    <td className="px-3 py-2">
                      {o.isDefault && (
                        <span className="text-xs bg-yellow-200 text-gray-800 px-2 py-0.5 rounded">
                          основная
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
          <div className="bg-white rounded-lg shadow-lg w-full max-w-xl mt-6 mb-10">
            <div className="px-4 py-3 border-b border-gray-200 flex items-center justify-between">
              <h3 className="font-semibold">
                {form.id ? "Организация" : "Новая организация"}
              </h3>
              <button
                onClick={() => setForm(null)}
                className="text-gray-400 hover:text-gray-700"
              >
                ✕
              </button>
            </div>
            <div className="p-4 space-y-3">
              <Field label="Наименование *">
                <input
                  autoFocus={!form.id}
                  value={form.name}
                  onChange={(e) => setForm({ ...form, name: e.target.value })}
                  className="input"
                />
              </Field>
              <Field label="Полное наименование">
                <input
                  value={form.fullName}
                  onChange={(e) => setForm({ ...form, fullName: e.target.value })}
                  className="input"
                />
              </Field>
              <div className="grid grid-cols-2 gap-3">
                <Field label="БИН / ИИН">
                  <input
                    value={form.bin}
                    onChange={(e) => setForm({ ...form, bin: e.target.value })}
                    className="input"
                  />
                </Field>
                <Field label="Руководитель">
                  <input
                    value={form.director}
                    onChange={(e) => setForm({ ...form, director: e.target.value })}
                    className="input"
                  />
                </Field>
              </div>
              <Field label="Юридический адрес">
                <input
                  value={form.address}
                  onChange={(e) => setForm({ ...form, address: e.target.value })}
                  className="input"
                />
              </Field>
              <div className="grid grid-cols-2 gap-3">
                <Field label="Телефон">
                  <input
                    value={form.phone}
                    onChange={(e) => setForm({ ...form, phone: e.target.value })}
                    className="input"
                  />
                </Field>
                <Field label="E-mail">
                  <input
                    value={form.email}
                    onChange={(e) => setForm({ ...form, email: e.target.value })}
                    className="input"
                  />
                </Field>
              </div>
              <div className="border-t border-gray-100 pt-3">
                <div className="text-xs font-semibold text-gray-500 mb-2">
                  Банковские реквизиты
                </div>
                <Field label="Банк">
                  <input
                    value={form.bankName}
                    onChange={(e) => setForm({ ...form, bankName: e.target.value })}
                    className="input"
                  />
                </Field>
                <div className="grid grid-cols-2 gap-3 mt-3">
                  <Field label="Расчётный счёт (IBAN)">
                    <input
                      value={form.bankAccount}
                      onChange={(e) => setForm({ ...form, bankAccount: e.target.value })}
                      className="input"
                    />
                  </Field>
                  <Field label="БИК">
                    <input
                      value={form.bankBik}
                      onChange={(e) => setForm({ ...form, bankBik: e.target.value })}
                      className="input"
                    />
                  </Field>
                </div>
              </div>
              <label className="flex items-center gap-2 text-sm pt-1">
                <input
                  type="checkbox"
                  checked={form.isDefault}
                  onChange={(e) => setForm({ ...form, isDefault: e.target.checked })}
                />
                Основная организация (по умолчанию)
              </label>
            </div>
            <div className="px-4 py-3 border-t border-gray-200 flex items-center gap-2">
              {form.id && (
                <button
                  onClick={archive}
                  disabled={busy}
                  className="px-3 py-1.5 rounded text-sm text-red-600 border border-red-200 hover:bg-red-50 disabled:opacity-50"
                >
                  Пометить на удаление
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
                  disabled={busy || !form.name.trim()}
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

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <label className="block">
      <span className="text-xs text-gray-500 mb-1 block">{label}</span>
      {children}
    </label>
  );
}
