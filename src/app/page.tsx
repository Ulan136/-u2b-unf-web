import Link from "next/link";

export default function Home() {
  return (
    <div className="min-h-screen">
      <header className="bg-yellow-400 text-gray-900 px-6 py-3 shadow">
        <h1 className="text-lg font-semibold">Веб-УНФ</h1>
      </header>
      <main className="max-w-3xl mx-auto p-6">
        <div className="grid gap-4 sm:grid-cols-2">
          <Link
            href="/nomenclature"
            className="block bg-white border border-gray-200 rounded-lg shadow-sm p-5 hover:border-yellow-400"
          >
            <div className="text-2xl">📋</div>
            <div className="mt-2 font-semibold">Номенклатура</div>
            <div className="text-sm text-gray-500">
              Справочник: группы-папки, товары и услуги, единицы, цены
            </div>
          </Link>
          <Link
            href="/counterparties"
            className="block bg-white border border-gray-200 rounded-lg shadow-sm p-5 hover:border-yellow-400"
          >
            <div className="text-2xl">👥</div>
            <div className="mt-2 font-semibold">Контрагенты</div>
            <div className="text-sm text-gray-500">
              Справочник: клиенты и поставщики, реквизиты, БИН/ИИН
            </div>
          </Link>
          <Link
            href="/warehouse"
            className="block bg-white border border-gray-200 rounded-lg shadow-sm p-5 hover:border-yellow-400"
          >
            <div className="text-2xl">📦</div>
            <div className="mt-2 font-semibold">Склад и остатки</div>
            <div className="text-sm text-gray-500">
              Остатки по складам, приход/расход, движения
            </div>
          </Link>
          <div className="block bg-white border border-gray-200 rounded-lg shadow-sm p-5 opacity-60">
            <div className="text-2xl">🔗</div>
            <div className="mt-2 font-semibold">Интеграция с Юкан</div>
            <div className="text-sm text-gray-500">
              Вебхук: /api/integrations/ukan (скоро — экран журнала)
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}
