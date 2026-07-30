import { z } from "zod";
import * as groupsRepo from "@/repositories/productGroups.repo";
import {
  listProducts,
  findProductById,
  updateProduct as updateProductRepo,
  archiveProduct as archiveProductRepo,
} from "@/repositories/products.repo";

const UNIT = z.enum(["шт", "кг", "м", "м2", "м3", "л", "компл", "уп"]);

export const productUpdateSchema = z.object({
  sku: z.string().min(1).max(64).optional(),
  name: z.string().min(1).max(300).optional(),
  fullName: z.string().optional().nullable(),
  oralName: z.string().optional().nullable(),
  name1c: z.string().optional().nullable(),
  groupId: z.string().uuid().optional().nullable(),
  kind: z.enum(["Товар", "Услуга", "Работа", "Набор"]).optional(),
  unit: UNIT.optional(),
  barcode: z.string().optional().nullable(),
  minStock: z.string().optional().nullable(),
  price: z.string().optional().nullable(),
  costPrice: z.string().optional().nullable(),
  note: z.string().optional().nullable(),
});

/** Бизнес-логика справочника «Номенклатура» (группы-папки + позиции). */

export const groupCreateSchema = z.object({
  name: z.string().min(1, "Название группы обязательно").max(200),
  parentId: z.string().uuid().nullable().optional(),
  code: z.string().optional(),
});

/**
 * Содержимое справочника для текущей папки:
 * - при поиске (q) — плоский список найденных позиций, группы не показываем;
 * - иначе — подгруппы текущей папки + позиции этой папки (groupId=null → корень).
 */
export async function getNomenclature(groupId: string | null, q?: string) {
  const [groups, products] = await Promise.all([
    q ? Promise.resolve([]) : groupsRepo.listGroups(groupId),
    listProducts(q, { groupId }),
  ]);
  return { groups, products };
}

export async function listGroups(parentId: string | null) {
  return groupsRepo.listGroups(parentId);
}

export async function createGroup(body: unknown) {
  const data = groupCreateSchema.parse(body);
  return groupsRepo.createGroup(data);
}

export async function getProduct(id: string) {
  const product = await findProductById(id);
  if (!product) throw new Error("Товар не найден");
  return product;
}

export async function updateProduct(id: string, body: unknown) {
  const data = productUpdateSchema.parse(body);
  const existing = await findProductById(id);
  if (!existing) throw new Error("Товар не найден");
  const updated = await updateProductRepo(id, data);
  return updated;
}

export async function archiveProduct(id: string) {
  const existing = await findProductById(id);
  if (!existing) throw new Error("Товар не найден");
  return archiveProductRepo(id);
}
