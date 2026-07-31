"use client";

import Link from "next/link";

type Org = {
  name: string;
  fullName: string | null;
  bin: string | null;
  address: string | null;
  phone: string | null;
  bankName: string | null;
  bankAccount: string | null;
  bankBik: string | null;
} | null;

type Item = {
  sku: string;
  productName: string;
  qty: string | number;
  unit: string | null;
  price: string | number;
  amount: string | number;
};

function money(v: string | number) {
  const n = Number(v ?? 0);
  return (Number.isFinite(n) ? n : 0).toLocaleString("ru-RU", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });
}
function qtyFmt(v: string | number) {
  const n = Number(v ?? 0);
  return (Number.isFinite(n) ? n : 0).toLocaleString("ru-RU");
}

/** Печатная форма документа (заказ/накладная) с реквизитами организации. */
export function DocumentPrint({
  title,
  docNo,
  date,
  org,
  counterpartyLabel,
  counterpartyName,
  items,
  total,
  paid,
  backHref,
}: {
  title: string;
  docNo: string;
  date: string;
  org: Org;
  counterpartyLabel: string;
  counterpartyName: string;
  items: Item[];
  total: number;
  paid: number;
  backHref: string;
}) {
  return (
    <div className="min-h-screen bg-gray-100 print:bg-white">
      {/* Панель — не печатается */}
      <div className="no-print bg-yellow-400 text-gray-900 px-6 py-3 shadow flex items-center gap-4">
        <Link href={backHref} className="text-sm hover:underline">
          ← Назад
        </Link>
        <span className="text-sm text-gray-700">Печатная форма</span>
        <button
          onClick={() => window.print()}
          className="ml-auto bg-gray-900 text-white px-4 py-1.5 rounded text-sm font-medium hover:bg-gray-700"
        >
          🖨 Печать
        </button>
      </div>

      {/* Лист A4 */}
      <div className="max-w-3xl mx-auto my-6 bg-white p-8 shadow print:shadow-none print:my-0 print:max-w-none text-sm text-gray-900">
        {/* Шапка — организация */}
        <div className="border-b-2 border-gray-800 pb-3 mb-4">
          <div className="font-bold text-base">
            {org?.fullName || org?.name || "Организация не заполнена"}
          </div>
          <div className="text-xs text-gray-600 mt-1 space-y-0.5">
            {org?.bin && <div>БИН/ИИН: {org.bin}</div>}
            {org?.address && <div>{org.address}</div>}
            {org?.phone && <div>Тел.: {org.phone}</div>}
            {(org?.bankName || org?.bankAccount) && (
              <div>
                {org?.bankName}
                {org?.bankAccount && `, счёт ${org.bankAccount}`}
                {org?.bankBik && `, БИК ${org.bankBik}`}
              </div>
            )}
          </div>
        </div>

        {/* Заголовок документа */}
        <div className="text-center mb-4">
          <div className="text-lg font-bold">{title}</div>
          <div className="text-xs text-gray-600">
            № {docNo} от {date}
          </div>
        </div>

        {/* Контрагент */}
        <div className="mb-4 text-sm">
          <span className="text-gray-600">{counterpartyLabel}: </span>
          <span className="font-semibold">{counterpartyName}</span>
        </div>

        {/* Таблица позиций */}
        <table className="w-full border-collapse text-sm mb-4">
          <thead>
            <tr className="bg-gray-100">
              <th className="border border-gray-400 px-2 py-1 text-left w-8">№</th>
              <th className="border border-gray-400 px-2 py-1 text-left">Наименование</th>
              <th className="border border-gray-400 px-2 py-1 text-right w-20">Кол-во</th>
              <th className="border border-gray-400 px-2 py-1 text-left w-14">Ед.</th>
              <th className="border border-gray-400 px-2 py-1 text-right w-24">Цена</th>
              <th className="border border-gray-400 px-2 py-1 text-right w-28">Сумма</th>
            </tr>
          </thead>
          <tbody>
            {items.map((it, i) => (
              <tr key={i}>
                <td className="border border-gray-400 px-2 py-1">{i + 1}</td>
                <td className="border border-gray-400 px-2 py-1">
                  {it.productName}
                  {it.sku && (
                    <span className="text-gray-400 text-xs"> ({it.sku})</span>
                  )}
                </td>
                <td className="border border-gray-400 px-2 py-1 text-right">
                  {qtyFmt(it.qty)}
                </td>
                <td className="border border-gray-400 px-2 py-1">{it.unit}</td>
                <td className="border border-gray-400 px-2 py-1 text-right">
                  {money(it.price)}
                </td>
                <td className="border border-gray-400 px-2 py-1 text-right">
                  {money(it.amount)}
                </td>
              </tr>
            ))}
          </tbody>
          <tfoot>
            <tr>
              <td colSpan={5} className="border border-gray-400 px-2 py-1 text-right font-bold">
                Итого:
              </td>
              <td className="border border-gray-400 px-2 py-1 text-right font-bold">
                {money(total)}
              </td>
            </tr>
          </tfoot>
        </table>

        <div className="text-right text-sm mb-8">
          {paid > 0 && (
            <div className="text-gray-600">
              Оплачено: {money(paid)} · Остаток: {money(Math.max(0, total - paid))}
            </div>
          )}
        </div>

        {/* Подписи */}
        <div className="flex justify-between mt-12 text-sm">
          <div>
            <div className="border-t border-gray-500 w-48 pt-1 text-center text-xs text-gray-600">
              Отпустил (подпись)
            </div>
          </div>
          <div>
            <div className="border-t border-gray-500 w-48 pt-1 text-center text-xs text-gray-600">
              Получил (подпись)
            </div>
          </div>
        </div>
      </div>

      <style jsx global>{`
        @media print {
          .no-print {
            display: none !important;
          }
          @page {
            margin: 12mm;
          }
        }
      `}</style>
    </div>
  );
}
