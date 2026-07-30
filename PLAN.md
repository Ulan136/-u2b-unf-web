# PLAN — u2b-unf-web · Веб-УНФ (склад + остатки + интеграция с Юкан)

> **Claude, читай этот файл ПЕРВЫМ в каждой новой сессии.** Здесь всегда актуальное
> состояние: что сделано (✅), что дальше (⬜). После каждого шага — обновляй файл.
> Метод построения проекта: `U:\METHOD.md`. Общается пользователь по-русски.

## Что это
Веб-версия части **1С:УНФ** (Управление нашей фирмой): **склад, остатки, движения**,
с **интеграцией с проектом «Юкан»** (события резерва/отгрузки/прихода приходят вебхуком).
НЕ путать с `u2b-vertex-erp` (отдельный проект, НЕ трогать) и `u2b-1sat` (пустая папка, заброшена).

## Стек
Next.js 14 (App Router, TS) · Tailwind · Neon Postgres (pooler) · Drizzle ORM · Zod · Vercel · PWA.
Слои: `app/api/*/route.ts` (тонкий контроллер) → `services/` (логика) → `repositories/` (Drizzle) → `db/schema.ts`.

## База данных (Neon) — ПОДКЛЮЧЕНА ✅
- `.env.local` содержит `DATABASE_URL` (Neon pooler, ap-southeast-1). Файл в .gitignore, в git НЕ коммитить.
- `npm run db:push` выполнен → таблицы созданы. Проверено.
- Таблицы: `unf_warehouses`, `unf_product_groups`, `unf_products`, `unf_stock_balances`,
  `unf_stock_movements`, `unf_integration_events`.
- Enum: `unf_stock_move_type` (IN/OUT/TRANSFER/ADJUST/RESERVE/UNRESERVE), `unf_unit` (шт/кг/м/м2/м3/л/компл/уп).

---

## Текущий статус (обновлено 2026-07-30, вечер)

**Готово ✅**
- Схема БД (`src/db/schema.ts`) + залита в Neon (`db:push`), таблицы проверены
- `src/lib/db.ts` (`getDb`), `src/lib/errors.ts` (формат ответа `{ok,data}` / `{ok,error}`)
- Репозитории: `products.repo.ts`, `stock.repo.ts`
- Сервис: `warehouse.service.ts` (zod, список/создание товара, движение, `handleUkanEvent`)
- **Каркас Next:** `src/app/layout.tsx`, `globals.css`, `page.tsx` (главная с плитками)
- **API-роуты написаны:**
    - `GET /api/health` — живость + БД
    - `GET /api/products?q=` (доска: items+movements) / `POST` (создать товар)
    - `POST /api/stock/move` — движение склада
    - `POST /api/integrations/ukan` — вебхук Юкан (проверка `X-Ukan-Secret` = UKAN_WEBHOOK_SECRET)
- **Страница `/warehouse`** — номенклатура с остатками (остаток/резерв/свободно), быстрый приход/расход,
  модалка нового товара, лента последних движений
- ✅ `tsc --noEmit` чисто, `npm run build` проходит
- ✅ **Smoke-тест против реальной Neon пройден:** health OK → создание товара → приход 10 (остаток 10)
  → расход 3 (остаток 7) → лента движений. Тестовые данные (ZZ-SMOKE) удалены, база чистая (0 товаров).

**НЕ готово (следующие шаги) ⬜**
- ⬜ Git: репозитория ещё НЕТ (`git init`), приватный GitHub-repo (аккаунт **Ulan136**), первый коммит
- ⬜ Vercel: Import, env `DATABASE_URL` + `UKAN_WEBHOOK_SECRET`, задать реальный секрет вебхука
- ⬜ Экран журнала интеграций Юкан (таблица `unf_integration_events`)
- ⬜ Справочники: группы номенклатуры (иерархия), несколько складов, перемещение (TRANSFER) в UI
- ⬜ Импорт номенклатуры из 1С/Юкан (сопоставление по sku)
- ⬜ PWA (manifest + SW)
- ⬜ Живое обновление (useLiveData: сейчас перезагрузка после действия; позже polling/real-time)

---

## Важные заметки
- **GitHub-аккаунт проекта — `Ulan136`** (не `ulan1988`!). Vercel-вход — через Ulan136.
- Vercel-проект этого репо пока НЕ создан (в интернет ещё не выкладывали).
- Юкан-интеграция: на первом этапе событие требует `productId` (сопоставление по `sku` — позже).
- Деньги/кол-во — `numeric` (в Drizzle строки). Архивация вместо удаления (`is_active`).

## Журнал решений
- 2026-07-30 — Определились: рабочий проект = `u2b-unf-web` (не u2b-1sat). Подключили Neon, залили таблицы.
