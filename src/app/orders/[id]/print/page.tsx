"use client";

import { useEffect, useState } from "react";
import { DocumentPrint } from "@/components/DocumentPrint";

function docNo(seq?: number) {
  return seq ? `ЗП-${String(seq).padStart(5, "0")}` : "";
}

export default function OrderPrintPage({ params }: { params: { id: string } }) {
  const [data, setData] = useState<any>(null);
  const [org, setOrg] = useState<any>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    (async () => {
      try {
        const res = await fetch(`/api/customer-orders/${params.id}`);
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

  const { order, items } = data;
  return (
    <DocumentPrint
      title="Заказ покупателя"
      docNo={docNo(order.seq)}
      date={order.orderDate ? String(order.orderDate).slice(0, 10) : ""}
      org={org}
      counterpartyLabel="Покупатель"
      counterpartyName={order.customerName}
      items={items}
      total={Number(order.totalSum ?? 0)}
      paid={Number(order.paid ?? 0)}
      backHref="/orders"
    />
  );
}
