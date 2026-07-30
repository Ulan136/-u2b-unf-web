import { z } from "zod";
import {
  createProduct,
  ensureDefaultWarehouse,
  listProducts,
} from "@/repositories/products.repo";
import { applyMove, listMovements } from "@/repositories/stock.repo";
import { getDb } from "@/lib/db";
import { integrationEvents } from "@/db/schema";

export const productCreateSchema = z.object({
  sku: z.string().min(1).max(64),
  name: z.string().min(1).max(300),
  fullName: z.string().optional(),
  oralName: z.string().optional(),
  name1c: z.string().optional(),
  groupId: z.string().uuid().optional(),
  unit: z
    .enum(["шт", "кг", "м", "м2", "м3", "л", "компл", "уп"])
    .optional(),
  barcode: z.string().optional(),
  minStock: z.string().optional(),
  price: z.string().optional(),
  costPrice: z.string().optional(),
  ukanNomenId: z.string().optional(),
  note: z.string().optional(),
});

export const moveSchema = z.object({
  productId: z.string().uuid(),
  warehouseId: z.string().uuid().optional(),
  warehouseToId: z.string().uuid().optional(),
  moveType: z.enum([
    "IN",
    "OUT",
    "TRANSFER",
    "ADJUST",
    "RESERVE",
    "UNRESERVE",
  ]),
  qty: z.string().min(1),
  price: z.string().optional(),
  docNo: z.string().optional(),
  ukanCardId: z.string().optional(),
  ukanPositionId: z.string().optional(),
  comment: z.string().optional(),
  author: z.string().optional(),
});

/** Событие из Юкан: списание/резерв при движении карточки */
export const ukanStockEventSchema = z.object({
  eventType: z.enum([
    "position.reserve",
    "position.unreserve",
    "position.ship",
    "position.receive",
  ]),
  cardId: z.string().min(1),
  positionId: z.string().optional(),
  productId: z.string().uuid().optional(),
  sku: z.string().optional(),
  qty: z.string().min(1),
  author: z.string().optional(),
  comment: z.string().optional(),
});

export async function bootstrapWarehouse() {
  const wh = await ensureDefaultWarehouse();
  return { warehouse: wh };
}

export async function getWarehouseBoard(q?: string) {
  await ensureDefaultWarehouse();
  const [items, movements] = await Promise.all([
    listProducts(q),
    listMovements(50),
  ]);
  return { items, movements };
}

export async function addProduct(body: unknown) {
  const data = productCreateSchema.parse(body);
  await ensureDefaultWarehouse();
  return createProduct(data);
}

export async function postMove(body: unknown) {
  const data = moveSchema.parse(body);
  return applyMove(data);
}

export async function handleUkanEvent(body: unknown) {
  const data = ukanStockEventSchema.parse(body);
  const db = getDb();

  const [log] = await db
    .insert(integrationEvents)
    .values({
      source: "ukan",
      eventType: data.eventType,
      externalId: data.positionId ?? data.cardId,
      payload: JSON.stringify(data),
      status: "processing",
    })
    .returning();

  try {
    if (!data.productId) {
      throw new Error(
        "productId обязателен на первом этапе (сопоставление по sku — позже)"
      );
    }

    const typeMap = {
      "position.reserve": "RESERVE",
      "position.unreserve": "UNRESERVE",
      "position.ship": "OUT",
      "position.receive": "IN",
    } as const;

    const move = await applyMove({
      productId: data.productId,
      moveType: typeMap[data.eventType],
      qty: data.qty,
      ukanCardId: data.cardId,
      ukanPositionId: data.positionId,
      author: data.author ?? "ukan",
      comment: data.comment ?? data.eventType,
      docNo: `UKAN-${data.cardId}`,
    });

    await db
      .update(integrationEvents)
      .set({ status: "done", processedAt: new Date() })
      .where(eqId(log.id));

    return { move, eventId: log.id };
  } catch (err) {
    const message = err instanceof Error ? err.message : "error";
    await db
      .update(integrationEvents)
      .set({ status: "error", error: message, processedAt: new Date() })
      .where(eqId(log.id));
    throw err;
  }
}

function eqId(id: number) {
  // локальный импорт, чтобы не тащить eq наверх в hot path без нужды
  const { eq } = require("drizzle-orm") as typeof import("drizzle-orm");
  return eq(integrationEvents.id, id);
}
