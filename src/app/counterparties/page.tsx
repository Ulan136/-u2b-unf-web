"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";

type Group = { id: string; code: string | null; name: string };

type Item = {
  id: string;
  code: string | null;
  name: string;
  fullName: string | null;
  legalType: string;
  bin: string | null;
  isCustomer: boolean | null;
  isSupplier: boolean | null;
  phone: string | null;
};

type Form = {
  id?: string;
  name: string;
  fullName: string;
  legalType: string;
  bin: string;
  isCustomer: boolean;
  isSupplier: boolean;
  phone: string;
  email: string;
  address: string;
  contactPerson: string;
  comment: string;
};

const LEGAL_TYPES = ["Юридическое", "Физическое", "ИП"];

function emptyForm(): Form {
  return {
    name: "",
    fullName: "",
    legalType: "Юридическое",
    bin: "",
    isCustomer: true,
    isSupplier: false,
    phone: "",
    email: "",
    address: "",
    contactPerson: "",
    comment: "",
  };
}

function roleLabel(it: Item) {
  const r = [];
  if (it.isCustomer) r.push("Покупатель");
  if (it.isSupplier) r.push("Поставщик");
  return r.join(", ");
}

export default function CounterpartiesPage() {
  const [groups, setGroups] = useState<Group[]>([]);
  const [items, setItems] = useState<Item[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [search, setSearch] = useState("");
  const [path, setPath] = useState<{ id: string; name: string }[]>([]);

  const [groupForm, setGroupForm] = useState<null | { name: string }>(null);
  const [form, setForm] = useState<Form | null>(null);
  const [busy, setBusy] = useState(false);

  const currentGroupId = path.length ? path[path.length - 1].id : null;

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const qs = new URLSearchParams();
      if (search.trim()) qs.set("q", search.trim());
      else if (currentGroupId) qs.set("groupId", currentGroupId);
      const res = await fetch(`/api/counterparties?${qs.toString()}`);
      const json = await res.json();
      if (!json.ok) throw new Error(json.error ?? "Ошибка загрузки");
      setGroups(json.data.groups);
      setItems(json.data.items);
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
      const res = await fetch("/api/counterparty-groups", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: groupForm.name, parentId: currentGroupId }),
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

  async function openItem(id: string) {
    setError(null);
    try {
      const res = await fetch(`/api/counterparties/${id}`);
      const json = await res.json();
      if (!json.ok) throw new Error(json.error ?? "Ошибка");
      const c = json.data;
      setForm({
        id: c.id,
        name: c.name ?? "",
        fullName: c.fullName ?? "",
        legalType: c.legalType ?? "Юридическое",
        bin: c.bin ?? "",
        isCustomer: !!c.isCustomer,
        isSupplier: !!c.isSupplier,
        phone: c.phone ?? "",
        email: c.email ?? "",
        address: c.address ?? "",
        contactPerson: c.contactPerson ?? "",
        comment: c.comment ?? "",
      });
    } catch (e) {
      setError(e instanceof Error ? e.message : "Ошибка");
    }
  }

  async function save() {
    if (!form) return;
    setBusy(true);
    setError(null);
    const f = form;
    const v = (s: string) => (s && s.trim() ? s.trim() : form.id ? null : undefined);
    const payload = {
      name: f.name,
      fullName: v(f.fullName),
      legalType: f.legalType,
      bin: v(f.bin),
      isCustomer: f.isCustomer,
      isSupplier: f.isSupplier,
      phone: v(f.phone),
      email: v(f.email),
      address: v(f.address),
      contactPerson: v(f.contactPerson),
      comment: v(f.comment),
      ...(f.id ? {} : { groupId: currentGroupId ?? undefined }),
    };
    try {
      const res = await fetch(
        f.id ? `/api/counterparties/${f.id}` : "/api/counterparties",
        {
          method: f.id ? "PATCH" : "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(payload),
        }
      );
      const json = await res.json();
      if (!json.ok) throw new Error(json.error ?? "Ошибка сохранения");
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
    setError(null);
    try {
      const res = await fetch(`/api/counterparties/${form.id}`, { method: "DELETE" });
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
        <h1 className="text-lg font-semibold">Контрагенты</h1>
      </header>

      <main className="max-w-6xl mx-auto p-4">
        <div className="flex flex-wrap items-center gap-2 mb-3">
          <button
            onClick={() => setForm(emptyForm())}
            className="bg-green-600 text-white px-3 py-1.5 rounded text-sm font-medium hover:bg-green-700"
          >
            + Контрагент
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
            placeholder="Поиск: наименование, БИН/ИИН, телефон…"
            className="ml-auto border border-gray-300 rounded px-3 py-1.5 text-sm w-72 max-w-full"
          />
        </div>

        <div className="text-sm text-gray-600 mb-2 flex flex-wrap items-center gap-1">
          <button onClick={() => setPath([])} className="hover:underline text-blue-700">
            Контрагенты
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
                <th className="px-3 py-2 font-medium">БИН/ИИН</th>
                <th className="px-3 py-2 font-medium">Роль</th>
                <th className="px-3 py-2 font-medium">Телефон</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr>
                  <td colSpan={4} className="px-3 py-6 text-center text-gray-400">
                    Загрузка…
                  </td>
                </tr>
              ) : groups.length === 0 && items.length === 0 ? (
                <tr>
                  <td colSpan={4} className="px-3 py-6 text-center text-gray-400">
                    Пусто. Создайте группу или контрагента.
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
                      <td className="px-3 py-2" colSpan={3}></td>
                    </tr>
                  ))}
                  {items.map((it) => (
                    <tr
                      key={it.id}
                      className="border-t border-gray-100 hover:bg-yellow-50 cursor-pointer"
                      onClick={() => openItem(it.id)}
                    >
                      <td className="px-3 py-2">
                        <span className="text-blue-700 hover:underline">{it.name}</span>
                        {it.fullName && (
                          <span className="text-gray-400 text-xs block">
                            {it.fullName}
                          </span>
                        )}
                      </td>
                      <td className="px-3 py-2 text-gray-500 font-mono">{it.bin}</td>
                      <td className="px-3 py-2 text-gray-500">{roleLabel(it)}</td>
                      <td className="px-3 py-2 text-gray-500">{it.phone}</td>
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
          <div className="flex justify-end gap-2 pt-2">
            <button
              onClick={() => setGroupForm(null)}
              className="px-3 py-1.5 rounded text-sm border border-gray-300 hover:bg-gray-50"
            >
              Отмена
            </button>
            <button
              onClick={saveGroup}
              disabled={busy || !groupForm.name.trim()}
              className="px-4 py-1.5 rounded text-sm bg-green-600 text-white font-medium hover:bg-green-700 disabled:opacity-50"
            >
              {busy ? "Сохранение…" : "Записать"}
            </button>
          </div>
        </Modal>
      )}

      {/* Карточка контрагента */}
      {form && (
        <Modal
          title={form.id ? "Карточка контрагента" : "Новый контрагент"}
          onClose={() => setForm(null)}
        >
          <div className="grid grid-cols-2 gap-3">
            <Field label="Наименование *">
              <input
                autoFocus={!form.id}
                value={form.name}
                onChange={(e) => setForm({ ...form, name: e.target.value })}
                className="input"
              />
            </Field>
            <Field label="Вид">
              <select
                value={form.legalType}
                onChange={(e) => setForm({ ...form, legalType: e.target.value })}
                className="input"
              >
                {LEGAL_TYPES.map((t) => (
                  <option key={t}>{t}</option>
                ))}
              </select>
            </Field>
          </div>
          <Field label="Полное наименование">
            <input
              value={form.fullName}
              onChange={(e) => setForm({ ...form, fullName: e.target.value })}
              className="input"
            />
          </Field>
          <div className="grid grid-cols-2 gap-3">
            <Field label="БИН / ИИН / ИНН">
              <input
                value={form.bin}
                onChange={(e) => setForm({ ...form, bin: e.target.value })}
                className="input"
              />
            </Field>
            <Field label="Телефон">
              <input
                value={form.phone}
                onChange={(e) => setForm({ ...form, phone: e.target.value })}
                className="input"
              />
            </Field>
          </div>
          <div className="flex gap-4 text-sm">
            <label className="flex items-center gap-2">
              <input
                type="checkbox"
                checked={form.isCustomer}
                onChange={(e) => setForm({ ...form, isCustomer: e.target.checked })}
              />
              Покупатель
            </label>
            <label className="flex items-center gap-2">
              <input
                type="checkbox"
                checked={form.isSupplier}
                onChange={(e) => setForm({ ...form, isSupplier: e.target.checked })}
              />
              Поставщик
            </label>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <Field label="E-mail">
              <input
                value={form.email}
                onChange={(e) => setForm({ ...form, email: e.target.value })}
                className="input"
              />
            </Field>
            <Field label="Контактное лицо">
              <input
                value={form.contactPerson}
                onChange={(e) => setForm({ ...form, contactPerson: e.target.value })}
                className="input"
              />
            </Field>
          </div>
          <Field label="Адрес">
            <input
              value={form.address}
              onChange={(e) => setForm({ ...form, address: e.target.value })}
              className="input"
            />
          </Field>
          <Field label="Комментарий">
            <textarea
              value={form.comment}
              onChange={(e) => setForm({ ...form, comment: e.target.value })}
              className="input h-16"
            />
          </Field>
          {!form.id && (
            <div className="text-xs text-gray-500">
              Будет создан в папке:{" "}
              <b>{path.length ? path[path.length - 1].name : "Контрагенты (корень)"}</b>
            </div>
          )}
          <div className="flex items-center gap-2 pt-2">
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
      <div className="bg-white rounded-lg shadow-lg w-full max-w-xl mt-10 mb-10">
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
