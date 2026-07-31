import {
  boolean,
  integer,
  numeric,
  pgEnum,
  pgTable,
  serial,
  text,
  timestamp,
  uniqueIndex,
  uuid,
  varchar,
} from "drizzle-orm/pg-core";
import { sql } from "drizzle-orm";

/** Типы складских движений (как в УНФ: приход / расход / перемещение / корректировка) */
export const stockMoveTypeEnum = pgEnum("unf_stock_move_type", [
  "IN", // приход
  "OUT", // расход
  "TRANSFER", // перемещение между складами
  "ADJUST", // инвентаризация / корректировка
  "RESERVE", // резерв под Юкан
  "UNRESERVE", // снятие резерва
]);

/** Единицы измерения */
export const unitEnum = pgEnum("unf_unit", [
  "шт",
  "кг",
  "м",
  "м2",
  "м3",
  "л",
  "компл",
  "уп",
]);

// ── Склады ────────────────────────────────────────────────────
export const warehouses = pgTable("unf_warehouses", {
  id: uuid("id").primaryKey().default(sql`gen_random_uuid()`),
  code: varchar("code", { length: 32 }).notNull().unique(),
  name: varchar("name", { length: 200 }).notNull(),
  address: text("address"),
  isDefault: boolean("is_default").default(false),
  isActive: boolean("is_active").default(true),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow(),
});

// ── Группы номенклатуры ───────────────────────────────────────
export const productGroups = pgTable("unf_product_groups", {
  id: uuid("id").primaryKey().default(sql`gen_random_uuid()`),
  code: varchar("code", { length: 32 }),
  name: varchar("name", { length: 200 }).notNull(),
  parentId: uuid("parent_id"),
  isActive: boolean("is_active").default(true),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow(),
});

// ── Номенклатура ──────────────────────────────────────────────
export const products = pgTable(
  "unf_products",
  {
    id: uuid("id").primaryKey().default(sql`gen_random_uuid()`),
    sku: varchar("sku", { length: 64 }).notNull(),
    name: varchar("name", { length: 300 }).notNull(),
    fullName: text("full_name"),
    /** Устное/разговорное название (как в Юкан oral) */
    oralName: varchar("oral_name", { length: 300 }),
    /** Имя как в 1С/УНФ (name1c) — для сверки */
    name1c: varchar("name_1c", { length: 300 }),
    groupId: uuid("group_id").references(() => productGroups.id),
    /** Вид номенклатуры (как в УНФ): Товар / Услуга / Работа / Набор */
    kind: varchar("kind", { length: 20 }).notNull().default("Товар"),
    unit: unitEnum("unit").default("шт"),
    barcode: varchar("barcode", { length: 64 }),
    minStock: numeric("min_stock", { precision: 14, scale: 3 }).default("0"),
    price: numeric("price", { precision: 14, scale: 2 }).default("0"),
    costPrice: numeric("cost_price", { precision: 14, scale: 2 }).default("0"),
    isActive: boolean("is_active").default(true),
    /** Внешний id позиции/номенклатуры в Юкан (если есть) */
    ukanNomenId: varchar("ukan_nomen_id", { length: 64 }),
    note: text("note"),
    createdAt: timestamp("created_at", { withTimezone: true }).defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).defaultNow(),
  },
  (t) => ({
    skuUq: uniqueIndex("unf_products_sku_uq").on(t.sku),
  })
);

// ── Остатки по складам ────────────────────────────────────────
export const stockBalances = pgTable(
  "unf_stock_balances",
  {
    id: uuid("id").primaryKey().default(sql`gen_random_uuid()`),
    productId: uuid("product_id")
      .references(() => products.id)
      .notNull(),
    warehouseId: uuid("warehouse_id")
      .references(() => warehouses.id)
      .notNull(),
    qty: numeric("qty", { precision: 14, scale: 3 }).notNull().default("0"),
    reserved: numeric("reserved", { precision: 14, scale: 3 })
      .notNull()
      .default("0"),
    updatedAt: timestamp("updated_at", { withTimezone: true }).defaultNow(),
  },
  (t) => ({
    productWhUq: uniqueIndex("unf_stock_product_wh_uq").on(
      t.productId,
      t.warehouseId
    ),
  })
);

// ── Движения склада ───────────────────────────────────────────
export const stockMovements = pgTable("unf_stock_movements", {
  id: uuid("id").primaryKey().default(sql`gen_random_uuid()`),
  productId: uuid("product_id")
    .references(() => products.id)
    .notNull(),
  warehouseId: uuid("warehouse_id")
    .references(() => warehouses.id)
    .notNull(),
  /** Для TRANSFER — склад назначения */
  warehouseToId: uuid("warehouse_to_id").references(() => warehouses.id),
  moveType: stockMoveTypeEnum("move_type").notNull(),
  qty: numeric("qty", { precision: 14, scale: 3 }).notNull(),
  price: numeric("price", { precision: 14, scale: 2 }).default("0"),
  totalSum: numeric("total_sum", { precision: 14, scale: 2 }).default("0"),
  docNo: varchar("doc_no", { length: 64 }),
  /** Ссылка на карточку/позицию Юкан */
  ukanCardId: varchar("ukan_card_id", { length: 64 }),
  ukanPositionId: varchar("ukan_position_id", { length: 64 }),
  comment: text("comment"),
  author: varchar("author", { length: 150 }),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow(),
});

// ── Группы контрагентов ───────────────────────────────────────
export const counterpartyGroups = pgTable("unf_counterparty_groups", {
  id: uuid("id").primaryKey().default(sql`gen_random_uuid()`),
  code: varchar("code", { length: 32 }),
  name: varchar("name", { length: 200 }).notNull(),
  parentId: uuid("parent_id"),
  isActive: boolean("is_active").default(true),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow(),
});

// ── Контрагенты (клиенты/поставщики) ──────────────────────────
export const counterparties = pgTable("unf_counterparties", {
  id: uuid("id").primaryKey().default(sql`gen_random_uuid()`),
  code: varchar("code", { length: 32 }),
  name: varchar("name", { length: 300 }).notNull(), // Наименование (рабочее)
  fullName: text("full_name"), // Полное юридическое наименование
  /** Юридическое / Физическое / ИП */
  legalType: varchar("legal_type", { length: 20 }).notNull().default("Юридическое"),
  bin: varchar("bin", { length: 32 }), // БИН / ИИН / ИНН
  isCustomer: boolean("is_customer").default(false), // Покупатель
  isSupplier: boolean("is_supplier").default(false), // Поставщик
  groupId: uuid("group_id").references(() => counterpartyGroups.id),
  phone: varchar("phone", { length: 64 }),
  email: varchar("email", { length: 128 }),
  address: text("address"),
  contactPerson: varchar("contact_person", { length: 200 }),
  comment: text("comment"),
  isActive: boolean("is_active").default(true),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).defaultNow(),
});

// ── Заказы покупателей (документ) ─────────────────────────────
export const orderStatusEnum = pgEnum("unf_order_status", [
  "Новый",
  "В работе",
  "Выполнен",
  "Отменён",
]);

export const customerOrders = pgTable("unf_customer_orders", {
  id: uuid("id").primaryKey().default(sql`gen_random_uuid()`),
  seq: serial("seq").notNull(), // номер документа (автонумерация)
  orderDate: timestamp("order_date", { withTimezone: true }).defaultNow(),
  counterpartyId: uuid("counterparty_id")
    .references(() => counterparties.id)
    .notNull(),
  warehouseId: uuid("warehouse_id").references(() => warehouses.id),
  status: orderStatusEnum("status").notNull().default("Новый"),
  comment: text("comment"),
  totalSum: numeric("total_sum", { precision: 14, scale: 2 })
    .notNull()
    .default("0"),
  /** Момент отгрузки (списания со склада). null = не отгружен. */
  shippedAt: timestamp("shipped_at", { withTimezone: true }),
  isActive: boolean("is_active").notNull().default(true),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).defaultNow(),
});

export const customerOrderItems = pgTable("unf_customer_order_items", {
  id: uuid("id").primaryKey().default(sql`gen_random_uuid()`),
  orderId: uuid("order_id")
    .references(() => customerOrders.id)
    .notNull(),
  productId: uuid("product_id")
    .references(() => products.id)
    .notNull(),
  qty: numeric("qty", { precision: 14, scale: 3 }).notNull(),
  price: numeric("price", { precision: 14, scale: 2 }).notNull().default("0"),
  amount: numeric("amount", { precision: 14, scale: 2 }).notNull().default("0"),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow(),
});

// ── Поступления (приходная накладная, документ) ───────────────
export const receipts = pgTable("unf_receipts", {
  id: uuid("id").primaryKey().default(sql`gen_random_uuid()`),
  seq: serial("seq").notNull(),
  receiptDate: timestamp("receipt_date", { withTimezone: true }).defaultNow(),
  counterpartyId: uuid("counterparty_id")
    .references(() => counterparties.id)
    .notNull(),
  warehouseId: uuid("warehouse_id").references(() => warehouses.id),
  status: orderStatusEnum("status").notNull().default("Новый"),
  comment: text("comment"),
  totalSum: numeric("total_sum", { precision: 14, scale: 2 })
    .notNull()
    .default("0"),
  /** Момент оприходования (прихода на склад). null = не проведён. */
  receivedAt: timestamp("received_at", { withTimezone: true }),
  isActive: boolean("is_active").notNull().default(true),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).defaultNow(),
});

export const receiptItems = pgTable("unf_receipt_items", {
  id: uuid("id").primaryKey().default(sql`gen_random_uuid()`),
  receiptId: uuid("receipt_id")
    .references(() => receipts.id)
    .notNull(),
  productId: uuid("product_id")
    .references(() => products.id)
    .notNull(),
  qty: numeric("qty", { precision: 14, scale: 3 }).notNull(),
  price: numeric("price", { precision: 14, scale: 2 }).notNull().default("0"),
  amount: numeric("amount", { precision: 14, scale: 2 }).notNull().default("0"),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow(),
});

// ── Заказы поставщикам (документ закупки) ─────────────────────
export const purchaseOrders = pgTable("unf_purchase_orders", {
  id: uuid("id").primaryKey().default(sql`gen_random_uuid()`),
  seq: serial("seq").notNull(),
  orderDate: timestamp("order_date", { withTimezone: true }).defaultNow(),
  counterpartyId: uuid("counterparty_id")
    .references(() => counterparties.id)
    .notNull(),
  warehouseId: uuid("warehouse_id").references(() => warehouses.id),
  status: orderStatusEnum("status").notNull().default("Новый"),
  comment: text("comment"),
  totalSum: numeric("total_sum", { precision: 14, scale: 2 })
    .notNull()
    .default("0"),
  isActive: boolean("is_active").notNull().default(true),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).defaultNow(),
});

export const purchaseOrderItems = pgTable("unf_purchase_order_items", {
  id: uuid("id").primaryKey().default(sql`gen_random_uuid()`),
  orderId: uuid("order_id")
    .references(() => purchaseOrders.id)
    .notNull(),
  productId: uuid("product_id")
    .references(() => products.id)
    .notNull(),
  qty: numeric("qty", { precision: 14, scale: 3 }).notNull(),
  price: numeric("price", { precision: 14, scale: 2 }).notNull().default("0"),
  amount: numeric("amount", { precision: 14, scale: 2 }).notNull().default("0"),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow(),
});

// ── Организации (реквизиты своей фирмы) ───────────────────────
export const organizations = pgTable("unf_organizations", {
  id: uuid("id").primaryKey().default(sql`gen_random_uuid()`),
  name: varchar("name", { length: 300 }).notNull(), // Наименование
  fullName: text("full_name"), // Полное наименование
  bin: varchar("bin", { length: 32 }), // БИН / ИИН
  address: text("address"), // Юридический адрес
  phone: varchar("phone", { length: 64 }),
  email: varchar("email", { length: 128 }),
  director: varchar("director", { length: 200 }), // Руководитель
  bankName: varchar("bank_name", { length: 200 }), // Банк
  bankAccount: varchar("bank_account", { length: 64 }), // Расчётный счёт (IBAN)
  bankBik: varchar("bank_bik", { length: 32 }), // БИК
  isDefault: boolean("is_default").default(false), // Основная организация
  isActive: boolean("is_active").notNull().default(true),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).defaultNow(),
});

// ── Журнал интеграций (Юкан ↔ УНФ) ────────────────────────────
export const integrationEvents = pgTable("unf_integration_events", {
  id: serial("id").primaryKey(),
  source: varchar("source", { length: 40 }).notNull().default("ukan"),
  eventType: varchar("event_type", { length: 80 }).notNull(),
  externalId: varchar("external_id", { length: 128 }),
  payload: text("payload"),
  status: varchar("status", { length: 32 }).notNull().default("received"),
  error: text("error"),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow(),
  processedAt: timestamp("processed_at", { withTimezone: true }),
});
