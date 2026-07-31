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
    ЗАПУШЕНО и ЗАДЕПЛОЕНО (commit 954573c), проверено на проде.

- ✅ Шаг 5 (2026-07-30): Документ **Заказ покупателя**. Новое:
    таблицы `unf_customer_orders` (seq автонумер, статус enum, totalSum, isActive),
    `unf_customer_order_items` (qty/price/amount) + db:push; `customerOrders.repo.ts`,
    `customerOrder.service.ts` (расчёт сумм строк и итога); API `GET/POST /api/customer-orders`,
    `GET/PATCH/DELETE /api/customer-orders/[id]`; страница `/orders` (список + редактор:
    выбор клиента и товаров через поиск-пикер, строки с кол-вом/ценой/суммой, статус, склад отгрузки,
    итог); плитка на главной. DELETE=архив. Smoke-тест пройден (итог 300→500, статусы, архив).
    tsc/build чисто. ЗАПУШЕНО и ЗАДЕПЛОЕНО (commit 520f5d1), проверено на проде.

- ✅ Шаг 6 (2026-07-31): **Отгрузка по заказу**. Новое: поле `shipped_at` в заказе + db:push;
    `stock.repo.getBalance` (проверка остатка); `customerOrder.service.shipOrder` (предпроверка
    остатков по всем строкам → списание OUT со склада заказа/основного → shippedAt + статус «Выполнен»,
    защита от повторной отгрузки); API `POST /api/customer-orders/[id]/ship`; в редакторе заказа —
    кнопка «📦 Отгрузить», баннер «отгружён» с блокировкой правки. Smoke-тест пройден
    (10→6 после отгрузки 4; повтор и нехватка отклонены, остаток не тронут). tsc/build чисто.
    ЗАПУШЕНО и ЗАДЕПЛОЕНО (commit 36dde4f), проверено на проде.

- ✅ Шаг 7 (2026-07-31): Документ **Поступление** (приходная накладная). Новое: таблицы
    `unf_receipts` (seq, статус, receivedAt, isActive) и `unf_receipt_items` + db:push;
    `receipts.repo.ts`, `receipt.service.ts` (расчёт сумм + `receiveReceipt` — приход IN на склад,
    защита от повторного проведения); API `GET/POST /api/receipts`, `GET/PATCH/DELETE /api/receipts/[id]`,
    `POST /api/receipts/[id]/receive`; страница `/receipts` (симметрична заказам: поставщик, строки,
    кнопка «📥 Оприходовать», баннер о проведении); плитка на главной. Номер ПН-00001.
    Smoke-тест пройден (0→15 после оприходования 15; повтор отклонён, остаток не удвоился). tsc/build чисто.
    ЗАПУШЕНО и ЗАДЕПЛОЕНО (commit c1e936b), проверено на проде.

- ✅ Шаг 8 (2026-07-31): Отчёт **«Остатки товаров»**. Новое: `reports.repo.ts` (агрегат остатков
    по складу/итого), `report.service.ts` (фильтр «только с остатком», стоимость по себестоимости, итоги);
    API `GET /api/reports/stock?warehouseId=&q=&onlyNonZero=`; страница `/reports/stock`
    (селектор склада, поиск, переключатель, таблица остаток/резерв/свободно/себест/стоимость + итог);
    плитка на главной. Smoke-тест пройден (приход 8, себест 30 → стоимость 240; фильтр нулей). tsc/build чисто.
    ЗАПУШЕНО и ЗАДЕПЛОЕНО (commit aae487f), проверено на проде.

- ✅ Шаг 9 (2026-07-31): Отчёт **«Продажи»** (по отгруженным заказам). Новое: `reports.repo.salesReport`
    (агрегат по товарам за период shipped_at), `report.service.salesReport` (период, итоги, по умолч.
    текущий месяц); API `GET /api/reports/sales?from=&to=`; страница `/reports/sales` (период с/по,
    продано/сумма, итог); плитка на главной. ⚠️ Пойман и исправлен баг с часовым поясом: `toISOString()`
    сдвигал конец месяца на день назад (терялся последний день) — заменено на локальный YYYY-MM-DD.
    Smoke-тест пройден (отгрузка 4×100=400 попадает в текущий месяц; прошлый период пуст). tsc/build чисто.
    ЗАПУШЕНО и ЗАДЕПЛОЕНО (commit 477d397), проверено на проде (период корректный).

- ✅ Шаг 10 (2026-07-31): Документ **Заказ поставщику** (план закупки). Новое: таблицы
    `unf_purchase_orders` (seq, статус, totalSum, isActive) и `unf_purchase_order_items` + db:push;
    `purchaseOrders.repo.ts`, `purchaseOrder.service.ts` (расчёт сумм; без движений склада —
    склад двигает Поступление); API `GET/POST /api/purchase-orders`, `GET/PATCH/DELETE /api/purchase-orders/[id]`;
    страница `/purchase-orders` (список + редактор: поставщик, строки, статус, итог), номер ЗАК-00001;
    плитка на главной. DELETE=архив. Smoke-тест пройден (итог 800→960, статусы, архив). tsc/build чисто.
    ЗАПУШЕНО и ЗАДЕПЛОЕНО (commit 6747de8), проверено на проде.

**НЕ готово (следующие шаги) ⬜**
- ✅ Шаг 11 (2026-07-31): Справочник **Организации** (реквизиты своей фирмы). Новое: таблица
    `unf_organizations` (name, БИН, адрес, телефон, email, руководитель, банк/счёт/БИК, isDefault) + db:push;
    `organizations.repo.ts`, `organization.service.ts` (логика одной основной организации);
    API `GET/POST /api/organizations`, `GET/PATCH/DELETE /api/organizations/[id]`; страница `/organizations`
    (список + карточка с банковскими реквизитами); плитка на главной. Smoke-тест пройден
    (первая=основная авто, переключение основной, банк-реквизиты). tsc/build чисто.
    ЗАПУШЕНО и ЗАДЕПЛОЕНО (commit b27d9e7), проверено на проде.
- ✅ Шаг 12 (2026-07-31): Отчёт **«Закупки»** (по оприходованным поступлениям). Новое:
    `reports.repo.purchaseReport` (агрегат по товарам за период received_at), `report.service.purchaseReport`;
    API `GET /api/reports/purchases?from=&to=`; страница `/reports/purchases` (период, закуплено/сумма, итог);
    плитка на главной. Smoke-тест пройден (12×40=480 в текущем месяце; прошлый период пуст). tsc/build чисто.
    ЗАПУШЕНО и ЗАДЕПЛОЕНО (commit b1314ed), проверено на проде.
- ✅ Шаг 13 (2026-07-31): Блок **«Деньги» (касса/банк)**. Новое: enum-ы `unf_money_account_kind`,
    `unf_money_op_kind`; таблицы `unf_money_accounts` (name, kind, isDefault) и `unf_money_operations`
    (seq, opDate, kind Приход/Расход, accountId, counterpartyId?, amount, comment) + db:push;
    `money.repo.ts` (счета с балансами через leftJoin+groupBy, операции), `money.service.ts`
    (логика основного счёта, валидация операций); API `/api/money/accounts` (+[id]), `/api/money/operations`;
    страница `/money` (карточки счетов с балансами, лента операций, +Приход/−Расход, +Счёт, привязка контрагента);
    плитка на главной. ⚠️ Пойман баг: коррелированный подзапрос баланса в Drizzle давал 0 — переписал на
    leftJoin+groupBy (raw SQL давал верно). Smoke-тест пройден (приход 5000−расход 2000=3000; итого 13000). tsc/build чисто.
    ЗАПУШЕНО и ЗАДЕПЛОЕНО (commit 7162033), проверено на проде.
- ✅ Шаг 14 (2026-07-31): Отчёт **«Взаиморасчёты с контрагентами»**. Новое: `settlements.repo.ts`
    (агрегаты: отгрузки/поступления/деньги по контрагентам), `settlement.service.ts`
    (долг клиента = отгружено−оплатил; наш долг = оприходовано−выплачено); API `GET /api/reports/settlements`
    (⚠️ `export const dynamic="force-dynamic"` — иначе GET без параметров кэшируется статически и отдаёт пусто);
    страница `/reports/settlements` (две сводные карточки + таблица по контрагентам); плитка на главной.
    ⚠️ Грабли: GET-роут без query-параметров Next 14 делает статическим → добавлять force-dynamic для «живых» отчётов.
    Также `Array.from(map.values())` вместо spread (иначе TS2802 downlevelIteration).
    Smoke-тест пройден (клиент должен 200, мы должны 200). tsc/build чисто. ЗАПУШЕНО и ЗАДЕПЛОЕНО (commit 973297a), проверено на проде.
- ✅ Шаг 15 (2026-07-31): **Оплата по документу**. Новое: поля `source_type`/`source_id` в
    `unf_money_operations` + db:push; `money.repo` — createOperation принимает source*, `sumPaidBySource`;
    `money.service.operationCreateSchema` — sourceType(enum)/sourceId; в `customerOrder.service.get` и
    `receipt.service.get` добавлено `paid` (сумма привязанных оплат); общий компонент
    `src/components/PaymentModal.tsx`; в редакторах заказа и поступления — кнопка «💵 Оплата»
    (заказ→Приход, поступление→Расход, привязка sourceType/sourceId, контрагент/сумма подставляются),
    строка «Оплачено X · осталось Y». Smoke-тест пройден (заказ paid=300, поступление paid=400,
    оплаты не смешиваются, баланс счёта −100). tsc/build чисто. ЗАПУШЕНО и ЗАДЕПЛОЕНО (commit b09de75), прод проверен.
- ✅ Шаг 16 (2026-07-31): **Печать документа**. Новое: общий компонент `src/components/DocumentPrint.tsx`
    (лист A4: шапка-реквизиты организации, номер/дата, контрагент, таблица позиций, итог/оплачено, подписи,
    print-CSS `@media print` скрывает панель, кнопка window.print()); печатные страницы
    `/orders/[id]/print` (Заказ покупателя, продавец=осн. организация) и `/receipts/[id]/print`
    (Приходная накладная); кнопки «🖨 Печать» (ссылка target=_blank) в редакторах заказа и поступления.
    Реквизиты берутся из основной организации. Smoke-тест пройден (организация+заказ для печати, роут 200).
    tsc/build чисто. ЗАПУШЕНО и ЗАДЕПЛОЕНО (commit d485d1a), прод проверен (роуты печати 200).
- ✅ Шаг 17 (2026-07-31): **Импорт номенклатуры**. Новое: `products.repo` — `getAllSkus`,
    `bulkCreateProducts`; `nomenclature.service.importProducts` (парс/валидация с терпимостью, дедуп по
    артикулу в файле и в базе, нормализация единицы→шт и чисел «1 200,50»→1200.5); API
    `POST /api/products/import`; на странице `/nomenclature` — кнопка «⬆ Импорт» и модалка
    (вставка из Excel TSV/CSV, авто-разбор, предпросмотр таблицей, отчёт создано/пропущено/ошибки).
    Smoke-тест пройден (created=2, skipped дубль, error нет-артикула, повтор created=0). tsc/build чисто.
    ЗАПУШЕНО и ЗАДЕПЛОЕНО (commit 23b041f), прод проверен.
- ✅ Шаг 18 (2026-07-31): Отчёт **«Движение денег»**. Новое: `reports.repo` — `cashFlow` (приход/расход
    по счетам за период), `openingBalances` (остаток до даты); `report.service.cashFlowReport`
    (входящий+приход−расход=исходящий по счетам + итоги, все активные счета); API
    `GET /api/reports/cashflow?from=&to=`; страница `/reports/cashflow` (период, таблица
    входящий/приход/расход/исходящий + итог); плитка на главной. Smoke-тест пройден
    (входящий 2000+приход 10000−расход 3000=исходящий 9000). tsc/build чисто. ЗАПУШЕНО и ЗАДЕПЛОЕНО (commit 0095570), прод проверен.
- ✅ Шаг 19 (2026-07-31): Печать **«Счёт на оплату»**. Новое: компонент `src/components/InvoicePrint.tsx`
    (банк.реквизиты получателя таблицей вверху, «Счёт на оплату № … от …», поставщик/покупатель,
    позиции, итог, «Всего наименований N на сумму», подписи Руководитель/Бухгалтер); страница
    `/orders/[id]/invoice`; кнопка «🧾 Счёт» в редакторе заказа. Реквизиты из основной организации.
    Smoke-тест пройден (банк.реквизиты+заказ, роут 200). tsc/build чисто. ЗАПУШЕНО и ЗАДЕПЛОЕНО (commit 1e66510), прод проверен.
- ✅ Шаг 20 (2026-07-31): Отчёт **«Прибыль»**. Новое: `reports.repo.profitReport` (по отгруженным
    заказам: выручка=сумма строк, себестоимость=кол-во×costPrice товара, по товарам за период);
    `report.service.profitReport` (прибыль=выручка−себест, рентабельность %, итоги); API
    `GET /api/reports/profit?from=&to=`; страница `/reports/profit` (3 карточки-сводки + таблица
    продано/выручка/себест/прибыль/%); плитка на главной. Smoke-тест пройден
    (5×100, себест 60 → выручка 500, себест 300, прибыль 200, 40%). tsc/build чисто. ЗАПУШЕНО и ЗАДЕПЛОЕНО (commit d804356), прод проверен.
### ПРОИЗВОДСТВО (по запросу пользователя):
- ✅ Шаг 21 (2026-07-31): Справочник **Спецификации** (состав изделия / BOM). Новое: таблицы
    `unf_specifications` (productId=изделие, name, outputQty) и `unf_specification_items`
    (materialProductId, qty) + db:push; `specifications.repo.ts` (список с count материалов через
    leftJoin+groupBy), `specification.service.ts`; API `GET/POST /api/specifications`,
    `GET/PATCH/DELETE /api/specifications/[id]`; страница `/specifications` (список + редактор:
    выбор изделия и материалов через поиск, кол-во на выпуск); плитка на главной. Smoke-тест пройден
    (спец с 2 материалами, чтение, правка состава). tsc/build чисто. ЗАПУШЕНО и ЗАДЕПЛОЕНО (commit 604b0e4), прод проверен.
- ✅ Шаг 22 (2026-07-31): Документ **«Производство»**. Новое: таблицы `unf_productions`
    (seq, productId=изделие, specId?, qty выпуска, cost, producedAt, isActive) и `unf_production_items`
    (materialProductId, qty) + db:push; `productions.repo.ts`, `production.service.ts` с `produce()`:
    предпроверка остатков материалов → списание OUT по каждому материалу → приход IN готового изделия
    (price=unitCost) → пересчёт `costPrice` изделия из материалов → producedAt+статус, защита от повтора;
    API `GET/POST /api/productions`, `GET/PATCH/DELETE /api/productions/[id]`, `POST /api/productions/[id]/produce`;
    страница `/productions` (список + редактор: изделие, кол-во, «Заполнить по спецификации», материалы,
    «🏭 Произвести», баннер о проведении с блокировкой); плитка на главной. Smoke-тест пройден
    (10 столов: доска 100→80, саморез 100→50, столы +10, себест 4250, costPrice изделия→425;
    повтор и нехватка отклонены). tsc/build чисто. Коммит готов, ждём «да» на push.

### Отложено на потом (по просьбе пользователя):
- ⬜ Синхронизация с Юканом (частично заложена: integration_events, handleUkanEvent) — вернуться после производства
- ⬜ Инвентаризация · Цены (виды цен) · Возврат от покупателя
- ⬜ Дашборд на главной — В САМОМ КОНЦЕ (сводка: стоимость склада, продажи, прибыль, мало на остатке)
- ⬜ PWA — пользователь даст инструкцию отдельно
- ⬜ PWA — ПОЛЬЗОВАТЕЛЬ ДАСТ ИНСТРУКЦИЮ ПОТОМ (установка на телефон)
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
