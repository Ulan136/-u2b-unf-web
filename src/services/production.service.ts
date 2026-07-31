import { z } from "zod";
import * as repo from "@/repositories/productions.repo";
import { applyMove, getBalance } from "@/repositories/stock.repo";
import {
  ensureDefaultWarehouse,
  updateProduct,
} from "@/repositories/products.repo";

/** Бизнес-логика документа «Производство»: материалы (−) → изделие (+). */

const itemSchema = z.object({
  materialProductId: z.string().uuid(),
  qty: z.coerce.number().positive("Количество материала должно быть > 0"),
});

const baseSchema = z.object({
  prodDate: z.coerce.date().optional(),
  productId: z.string().uuid("Выберите изделие"),
  specId: z.string().uuid().optional().nullable(),
  qty: z.coerce.number().positive("Количество выпуска должно быть > 0"),
  warehouseId: z.string().uuid().optional().nullable(),
  status: z.enum(["Новый", "В работе", "Выполнен", "Отменён"]).optional(),
  comment: z.string().optional().nullable(),
  items: z.array(itemSchema).default([]),
});

export const productionCreateSchema = baseSchema;
export const productionUpdateSchema = baseSchema;

function toRows(items: z.infer<typeof itemSchema>[]) {
  return items.map((it) => ({
    materialProductId: it.materialProductId,
    qty: String(it.qty),
  }));
}

export function list() {
  return repo.listProductions();
}

export async function get(id: string) {
  const production = await repo.getById(id);
  if (!production) throw new Error("Документ производства не найден");
  const items = await repo.getItems(id);
  return { production, items };
}

export async function create(body: unknown) {
  const data = productionCreateSchema.parse(body);
  return repo.createProduction(
    {
      prodDate: data.prodDate,
      productId: data.productId,
      specId: data.specId ?? null,
      qty: String(data.qty),
      warehouseId: data.warehouseId ?? null,
      status: data.status ?? "Новый",
      comment: data.comment ?? null,
    },
    toRows(data.items)
  );
}

export async function update(id: string, body: unknown) {
  const data = productionUpdateSchema.parse(body);
  const existing = await repo.findById(id);
  if (!existing) throw new Error("Документ производства не найден");
  await repo.replaceItems(id, toRows(data.items));
  return repo.updateHeader(id, {
    prodDate: data.prodDate,
    productId: data.productId,
    specId: data.specId ?? null,
    qty: String(data.qty),
    warehouseId: data.warehouseId ?? null,
    status: data.status,
    comment: data.comment ?? null,
  });
}

export async function archive(id: string) {
  const existing = await repo.findById(id);
  if (!existing) throw new Error("Документ производства не найден");
  return repo.archive(id);
}

/**
 * Провести производство: списать материалы (OUT, с проверкой остатков),
 * оприходовать готовое изделие (IN), рассчитать себестоимость.
 */
export async function produce(id: string) {
  const doc = await repo.findById(id);
  if (!doc) throw new Error("Документ производства не найден");
  if (doc.producedAt) throw new Error("Производство уже проведено");

  const items = await repo.getItems(id);
  if (!items.length) throw new Error("В документе нет материалов");

  const warehouseId = doc.warehouseId ?? (await ensureDefaultWarehouse()).id;

  // Проверка достаточности материалов.
  const shortages: string[] = [];
  for (const it of items) {
    const bal = await getBalance(it.materialProductId, warehouseId);
    const free = Number(bal?.qty ?? 0) - Number(bal?.reserved ?? 0);
    if (free < Number(it.qty)) {
      shortages.push(`${it.materialName}: нужно ${it.qty}, свободно ${free}`);
    }
  }
  if (shortages.length) {
    throw new Error("Недостаточно материалов — " + shortages.join("; "));
  }

  const docNumber = `ПР-${String(doc.seq).padStart(5, "0")}`;
  const produceQty = Number(doc.qty);

  // Себестоимость выпуска = сумма (кол-во материала × себестоимость материала).
  let totalCost = 0;
  for (const it of items) {
    totalCost += Number(it.qty) * Number(it.costPrice ?? 0);
  }
  const unitCost = produceQty > 0 ? totalCost / produceQty : 0;

  // Списание материалов.
  for (const it of items) {
    await applyMove({
      productId: it.materialProductId,
      moveType: "OUT",
      qty: it.qty,
      price: it.costPrice ?? "0",
      warehouseId,
      docNo: docNumber,
      comment: `Списание в производство ${docNumber}`,
      author: "web",
    });
  }

  // Оприходование готового изделия.
  await applyMove({
    productId: doc.productId,
    moveType: "IN",
    qty: String(produceQty),
    price: unitCost.toFixed(2),
    warehouseId,
    docNo: docNumber,
    comment: `Выпуск продукции ${docNumber}`,
    author: "web",
  });

  // Себестоимость изделия ← из материалов.
  if (unitCost > 0) {
    await updateProduct(doc.productId, { costPrice: unitCost.toFixed(2) });
  }

  return repo.updateHeader(id, {
    producedAt: new Date(),
    status: "Выполнен",
    cost: totalCost.toFixed(2),
  });
}
