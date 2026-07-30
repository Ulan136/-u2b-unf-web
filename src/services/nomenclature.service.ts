import { z } from "zod";
import * as groupsRepo from "@/repositories/productGroups.repo";
import { listProducts } from "@/repositories/products.repo";

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
