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
  director: string | null;
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

/** Печатная форма «Счёт на оплату» — с банковскими реквизитами получателя. */
export function InvoicePrint({
  docNo,
  date,
  org,
  buyerName,
  items,
  total,
  backHref,
}: {
  docNo: string;
  date: string;
  org: Org;
  buyerName: string;
  items: Item[];
  total: number;
  backHref: string;
}) {
  return (
    <div className="min-h-screen bg-gray-100 print:bg-white">
      <div className="no-print bg-yellow-400 text-gray-900 px-6 py-3 shadow flex items-center gap-4">
        <Link href={backHref} className="text-sm hover:underline">
          ← Назад
        </Link>
        <span className="text-sm text-gray-700">Счёт на оплату</span>
        <button
          onClick={() => window.print()}
          className="ml-auto bg-gray-900 text-white px-4 py-1.5 rounded text-sm font-medium hover:bg-gray-700"
        >
          🖨 Печать
        </button>
      </div>

      <div className="max-w-3xl mx-auto my-6 bg-white p-8 shadow print:shadow-none print:my-0 print:max-w-none text-sm text-gray-900">
        {/* Банковские реквизиты получателя */}
        <table className="w-full border-collapse text-xs mb-4">
          <tbody>
            <tr>
              <td className="border border-gray-400 px-2 py-1 w-1/2">
                <div className="text-gray-500">Бенефициар</div>
                <div className="font-semibold">
                  {org?.fullName || org?.name || "—"}
                </div>
                {org?.bin && <div>БИН: {org.bin}</div>}
              </td>
              <td className="border border-gray-400 px-2 py-1">
                <div className="text-gray-500">ИИК (счёт)</div>
                <div className="font-mono font-semibold">{org?.bankAccount || "—"}</div>
              </td>
            </tr>
            <tr>
              <td className="border border-gray-400 px-2 py-1">
                <div className="text-gray-500">Банк</div>
                <div>{org?.bankName || "—"}</div>
              </td>
              <td className="border border-gray-400 px-2 py-1">
                <div className="text-gray-500">БИК</div>
                <div className="font-mono">{org?.bankBik || "—"}</div>
              </td>
            </tr>
          </tbody>
        </table>

        {/* Заголовок */}
        <div className="border-b-2 border-gray-800 pb-2 mb-4">
          <div className="text-lg font-bold">
            Счёт на оплату № {docNo} от {date}
          </div>
        </div>

        {/* Стороны */}
        <div className="space-y-1 mb-4 text-sm">
          <div>
            <span className="text-gray-600">Поставщик: </span>
            <span className="font-semibold">{org?.fullName || org?.name || "—"}</span>
            {org?.bin && <span>, БИН {org.bin}</span>}
            {org?.address && <span>, {org.address}</span>}
          </div>
          <div>
            <span className="text-gray-600">Покупатель: </span>
            <span className="font-semibold">{buyerName}</span>
          </div>
        </div>

        {/* Позиции */}
        <table className="w-full border-collapse text-sm mb-3">
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
                  {it.sku && <span className="text-gray-400 text-xs"> ({it.sku})</span>}
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

        <div className="text-sm mb-8">
          Всего наименований {items.length}, на сумму{" "}
          <span className="font-bold">{money(total)} ₸</span>
        </div>

        <div className="text-xs text-gray-500 mb-8">
          Оплата данного счёта означает согласие с условиями поставки. Товар отпускается по факту
          прихода денег на счёт Поставщика.
        </div>

        {/* Подписи */}
        <div className="flex gap-12 mt-10 text-sm">
          <div>
            <span className="text-gray-600">Руководитель</span>
            <div className="border-t border-gray-500 w-56 mt-6 pt-1 text-xs text-gray-500">
              {org?.director || "(подпись)"}
            </div>
          </div>
          <div>
            <span className="text-gray-600">Бухгалтер</span>
            <div className="border-t border-gray-500 w-56 mt-6 pt-1 text-xs text-gray-500">
              (подпись)
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
