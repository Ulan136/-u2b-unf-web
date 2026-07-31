"use client";

import { useEffect, useState } from "react";
import { DocumentPrint } from "@/components/DocumentPrint";

function docNo(seq?: number) {
  return seq ? `ПН-${String(seq).padStart(5, "0")}` : "";
}

export default function ReceiptPrintPage({ params }: { params: { id: string } }) {
  const [data, setData] = useState<any>(null);
  const [org, setOrg] = useState<any>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    (async () => {
      try {
        const res = await fetch(`/api/receipts/${params.id}`);
        const json = await res.json();
        if (!json.ok) throw new Error(json.error ?? "Ошибка");
        setData(json.data);
        const orgs = await (await fetch("/api/organizations")).json();
        if (orgs.ok) {
          setOrg(orgs.data.find((o: any) => o.isDefault) ?? orgs.data[0] ?? null);
        }
      } catch (e) {
        setError(e instanceof Error ? e.message : "Ошибка");
      }
    })();
  }, [params.id]);

  if (error) return <div className="p-6 text-red-600">{error}</div>;
  if (!data) return <div className="p-6 text-gray-400">Загрузка…</div>;

  const { receipt, items } = data;
  return (
    <DocumentPrint
      title="Приходная накладная"
      docNo={docNo(receipt.seq)}
      date={receipt.receiptDate ? String(receipt.receiptDate).slice(0, 10) : ""}
      org={org}
      counterpartyLabel="Поставщик"
      counterpartyName={receipt.supplierName}
      items={items}
      total={Number(receipt.totalSum ?? 0)}
      paid={Number(receipt.paid ?? 0)}
      backHref="/receipts"
    />
  );
}
