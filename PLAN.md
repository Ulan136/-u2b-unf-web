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

**Этапы копирования УНФ (по одному, пуш — по «да» пользователя):**
- ✅ Шаг 1 (2026-07-30): Справочник **Номенклатура с группами-папками**. Новое:
    `productGroups.repo.ts`, `nomenclature.service.ts`, `GET/POST /api/product-groups`,
    `GET /api/nomenclature?groupId=&q=`, страница `/nomenclature` (навигация по папкам, создание группы/товара
    в текущей папке), плитка на главной. products.repo: фильтр по группе + groupId при создании.
    Проверено smoke-тестом (группа→товар в группе→навигация). tsc/build чисто. ЗАПУШЕНО (commit e63e90d).

- ✅ Шаг 2 (2026-07-30): **Карточка номенклатуры** (открытие/редактирование). Новое:
    поле `kind` (Товар/Услуга/Работа/Набор) в схеме + db:push; `GET/PATCH/DELETE /api/products/[id]`;
    в products.repo — `findProductById`, `updateProduct`, `archiveProduct`, фильтр `is_active=true` в списках;
    nomenclature.service — `getProduct/updateProduct/archiveProduct` + `productUpdateSchema`;
    страница /nomenclature — полная карточка (все поля, вид, себестоимость, штрихкод, комментарий),
    клик по товару открывает карточку, кнопка «Пометить на удаление». Smoke-тест пройден. tsc/build чисто.
    ЗАПУШЕНО и ЗАДЕПЛОЕНО (commit 4ade6e8), проверено на проде.

- ✅ Шаг 3 (2026-07-30): Справочник **Контрагенты** (клиенты/поставщики). Новое:
    таблицы `unf_counterparty_groups`, `unf_counterparties` + db:push; `counterparties.repo.ts`,
    `counterparty.service.ts`; API `GET/POST /api/counterparty-groups`, `GET/POST /api/counterparties`
    (GET = папка {groups,items}), `GET/PATCH/DELETE /api/counterparties/[id]`; страница `/counterparties`
    (папки, карточка: наименование, вид Юр/Физ/ИП, БИН/ИИН, Покупатель/Поставщик, телефон, email, адрес,
    контактное лицо, комментарий, архивация); плитка на главной. Smoke-тест пройден. tsc/build чисто.
    ЗАПУШЕНО и ЗАДЕПЛОЕНО (commit 5264e78), проверено на проде.

- ✅ Шаг 4 (2026-07-30): Справочник **Склады** + перемещения. Новое:
    `warehouses.repo.ts`, `warehouses.service.ts` (логика одного основного склада); API
    `GET/POST /api/warehouses`, `GET/PATCH/DELETE /api/warehouses/[id]`; страница `/warehouses`
    (CRUD, признак «основной»); в доске склада `/warehouse` — селектор склада (остаток по складу),
    тип движения «Перемещение» (TRANSFER) со складом-получателем; listProducts/listMovements — фильтр по складу;
    getWarehouseBoard(q, warehouseId) возвращает и список складов; плитка на главной. Smoke-тест пройден
    (приход 20 на основной → перемещение 5 → основной 15 / Склад-2 5 / всего 20). tsc/build чисто.

**НЕ готово (следующие шаги) ⬜**
- ✅ Git: `git init`, первый коммит (25 файлов, без секретов)
- ✅ GitHub: **https://github.com/Ulan136/-u2b-unf-web** (публичный, аккаунт Ulan136), запушено (ветка main)
      ⚠️ имя репо с ДЕФИСОМ в начале: `-u2b-unf-web`; remote origin = HTTPS (SSH-ключа на ПК нет)
- ✅ **Vercel — ЗАДЕПЛОЕНО:** прод-адрес **https://u2b-unf-web-9j5m.vercel.app**
      env `DATABASE_URL` + `UKAN_WEBHOOK_SECRET` заданы. `/api/health` → `{ok:true, db:connected}` (проверено).
      Обновление прода: `git push` → Vercel сам пересобирает (~1 мин).
      ⚠️ Грабли пройдены: в значение env-переменной нельзя вставлять `#`-комментарий, `DATABASE_URL=` и кавычки — только сама строка.
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

## Как вернуться в чат Claude (чтобы не терять)
- **ID чата (сессия):** `7924bdbf-0719-4122-8778-adeeb9abb508`
- **Файл чата:** `C:\Users\User\.claude\projects\C--Users-User-Documents-GitHub-u2b-1sat\7924bdbf-0719-4122-8778-adeeb9abb508.jsonl`
- **Возобновить:** из папки `u2b-1sat` → `claude --resume 7924bdbf-0719-4122-8778-adeeb9abb508`
  (чат привязан к папке `u2b-1sat`, откуда был запущен Claude).
- Даже без чата: весь контекст — в ЭТОМ PLAN.md. В новой сессии Claude читает его первым.

## Журнал решений
- 2026-07-30 — Определились: рабочий проект = `u2b-unf-web` (не u2b-1sat). Подключили Neon, залили таблицы.
