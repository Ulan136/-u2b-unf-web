import { and, desc, eq, sql } from "drizzle-orm";
import { getDb } from "@/lib/db";
import { products, stockBalances, stockMovements, warehouses } from "@/db/schema";

export type MoveInput = {
  productId: string;
  warehouseId?: string;
  warehouseToId?: string;
  moveType: "IN" | "OUT" | "TRANSFER" | "ADJUST" | "RESERVE" | "UNRESERVE";
  qty: string;
  price?: string;
  docNo?: string;
  ukanCardId?: string;
  ukanPositionId?: string;
  comment?: string;
  author?: string;
};

async function resolveWarehouseId(explicit?: string) {
  const db = getDb();
  if (explicit) return explicit;
  const [wh] = await db
    .select()
    .from(warehouses)
    .where(eq(warehouses.isDefault, true))
    .limit(1);
  if (!wh) throw new Error("Нет склада. Создайте основной склад.");
  return wh.id;
}

async function getOrCreateBalance(productId: string, warehouseId: string) {
  const db = getDb();
  const [existing] = await db
    .select()
    .from(stockBalances)
    .where(
      and(
        eq(stockBalances.productId, productId),
        eq(stockBalances.warehouseId, warehouseId)
      )
    )
    .limit(1);

  if (existing) return existing;

  const [created] = await db
    .insert(stockBalances)
    .values({ productId, warehouseId, qty: "0", reserved: "0" })
    .returning();
  return created;
}

export async function listMovements(limit = 100, warehouseId?: string) {
  const db = getDb();
  return db
    .select({
      id: stockMovements.id,
      moveType: stockMovements.moveType,
      qty: stockMovements.qty,
      price: stockMovements.price,
      totalSum: stockMovements.totalSum,
      docNo: stockMovements.docNo,
      ukanCardId: stockMovements.ukanCardId,
      comment: stockMovements.comment,
      author: stockMovements.author,
      createdAt: stockMovements.createdAt,
      productName: products.name,
      sku: products.sku,
      warehouseName: warehouses.name,
    })
    .from(stockMovements)
    .innerJoin(products, eq(products.id, stockMovements.productId))
    .innerJoin(warehouses, eq(warehouses.id, stockMovements.warehouseId))
    .where(
      warehouseId ? eq(stockMovements.warehouseId, warehouseId) : undefined
    )
    .orderBy(desc(stockMovements.createdAt))
    .limit(limit);
}

export async function applyMove(input: MoveInput) {
  const db = getDb();
  const warehouseId = await resolveWarehouseId(input.warehouseId);
  const qtyNum = Number(input.qty);
  if (!Number.isFinite(qtyNum) || qtyNum <= 0) {
    throw new Error("Количество должно быть > 0");
  }

  const bal = await getOrCreateBalance(input.productId, warehouseId);
  let nextQty = Number(bal.qty);
  let nextReserved = Number(bal.reserved);

  switch (input.moveType) {
    case "IN":
      nextQty += qtyNum;
      break;
    case "OUT":
      if (nextQty - nextReserved < qtyNum) {
        throw new Error(
          `Недостаточно свободного остатка (доступно ${nextQty - nextReserved})`
        );
      }
      nextQty -= qtyNum;
      break;
    case "ADJUST":
      nextQty = qtyNum;
      break;
    case "RESERVE":
      if (nextQty - nextReserved < qtyNum) {
        throw new Error("Недостаточно для резерва");
      }
      nextReserved += qtyNum;
      break;
    case "UNRESERVE":
      nextReserved = Math.max(0, nextReserved - qtyNum);
      break;
    case "TRANSFER": {
      if (!input.warehouseToId) throw new Error("Укажите склад назначения");
      if (nextQty - nextReserved < qtyNum) {
        throw new Error("Недостаточно для перемещения");
      }
      nextQty -= qtyNum;
      const toBal = await getOrCreateBalance(input.productId, input.warehouseToId);
      await db
        .update(stockBalances)
        .set({
          qty: String(Number(toBal.qty) + qtyNum),
          updatedAt: sql`now()`,
        })
        .where(eq(stockBalances.id, toBal.id));
      break;
    }
    default:
      throw new Error("Неизвестный тип движения");
  }

  await db
    .update(stockBalances)
    .set({
      qty: String(nextQty),
      reserved: String(nextReserved),
      updatedAt: sql`now()`,
    })
    .where(eq(stockBalances.id, bal.id));

  const price = Number(input.price ?? 0);
  const [move] = await db
    .insert(stockMovements)
    .values({
      productId: input.productId,
      warehouseId,
      warehouseToId: input.warehouseToId,
      moveType: input.moveType,
      qty: String(qtyNum),
      price: String(price),
      totalSum: String(price * qtyNum),
      docNo: input.docNo,
      ukanCardId: input.ukanCardId,
      ukanPositionId: input.ukanPositionId,
      comment: input.comment,
      author: input.author ?? "web",
    })
    .returning();

  return move;
}
