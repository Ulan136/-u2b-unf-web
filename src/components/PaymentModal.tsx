"use client";

import { useState } from "react";

function today() {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(
    d.getDate()
  ).padStart(2, "0")}`;
}

/** Модалка регистрации оплаты по документу (заказ покупателя / поступление). */
export function PaymentModal({
  title,
  kindLabel,
  accounts,
  defaultAmount,
  defaultComment,
  busy,
  onPay,
  onClose,
}: {
  title: string;
  kindLabel: string;
  accounts: { id: string; name: string }[];
  defaultAmount: number;
  defaultComment: string;
  busy: boolean;
  onPay: (data: {
    accountId: string;
    amount: string;
    opDate: string;
    comment: string;
  }) => void;
  onClose: () => void;
}) {
  const [accountId, setAccountId] = useState(accounts[0]?.id ?? "");
  const [amount, setAmount] = useState(defaultAmount ? String(defaultAmount) : "");
  const [opDate, setOpDate] = useState(today());
  const [comment, setComment] = useState(defaultComment);

  return (
    <div className="fixed inset-0 bg-black/40 flex items-start justify-center p-4 overflow-y-auto z-20">
      <div className="bg-white rounded-lg shadow-lg w-full max-w-md mt-16">
        <div className="px-4 py-3 border-b border-gray-200 flex items-center justify-between">
          <h3 className="font-semibold">{title}</h3>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-700">
            ✕
          </button>
        </div>
        <div className="p-4 space-y-3">
          <div className="text-xs text-gray-500">{kindLabel}</div>
          {accounts.length === 0 ? (
            <div className="text-sm text-red-600">
              Нет счетов. Сначала создайте счёт/кассу в разделе «Деньги».
            </div>
          ) : (
            <>
              <div className="grid grid-cols-2 gap-3">
                <label className="block">
                  <span className="text-xs text-gray-500 mb-1 block">Сумма *</span>
                  <input
                    autoFocus
                    value={amount}
                    onChange={(e) => setAmount(e.target.value)}
                    className="input"
                    inputMode="decimal"
                  />
                </label>
                <label className="block">
                  <span className="text-xs text-gray-500 mb-1 block">Дата</span>
                  <input
                    type="date"
                    value={opDate}
                    onChange={(e) => setOpDate(e.target.value)}
                    className="input"
                  />
                </label>
              </div>
              <label className="block">
                <span className="text-xs text-gray-500 mb-1 block">Счёт / касса</span>
                <select
                  value={accountId}
                  onChange={(e) => setAccountId(e.target.value)}
                  className="input"
                >
                  {accounts.map((a) => (
                    <option key={a.id} value={a.id}>
                      {a.name}
                    </option>
                  ))}
                </select>
              </label>
              <label className="block">
                <span className="text-xs text-gray-500 mb-1 block">Комментарий</span>
                <input
                  value={comment}
                  onChange={(e) => setComment(e.target.value)}
                  className="input"
                />
              </label>
            </>
          )}
        </div>
        <div className="px-4 py-3 border-t border-gray-200 flex justify-end gap-2">
          <button
            onClick={onClose}
            className="px-3 py-1.5 rounded text-sm border border-gray-300 hover:bg-gray-50"
          >
            Отмена
          </button>
          <button
            onClick={() => onPay({ accountId, amount, opDate, comment })}
            disabled={busy || !accountId || !amount.trim()}
            className="px-4 py-1.5 rounded text-sm bg-blue-600 text-white font-medium hover:bg-blue-700 disabled:opacity-50"
          >
            {busy ? "Сохранение…" : "Провести оплату"}
          </button>
        </div>
      </div>
    </div>
  );
}
