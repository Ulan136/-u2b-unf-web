import { z } from "zod";
import * as repo from "@/repositories/warehouses.repo";

/** Бизнес-логика справочника «Склады». */

export const warehouseCreateSchema = z.object({
  code: z.string().min(1, "Код обязателен").max(32),
  name: z.string().min(1, "Наименование обязательно").max(200),
  address: z.string().optional().nullable(),
  isDefault: z.boolean().optional(),
});

export const warehouseUpdateSchema = warehouseCreateSchema.partial();

export function list(includeArchived = false) {
  return repo.listWarehouses(includeArchived);
}

export async function getById(id: string) {
  const row = await repo.findById(id);
  if (!row) throw new Error("Склад не найден");
  return row;
}

export async function create(body: unknown) {
  const data = warehouseCreateSchema.parse(body);
  // Первый склад всегда основной; иначе — если попросили основной, снимаем у прочих.
  const existing = await repo.listWarehouses(true);
  const isDefault = existing.length === 0 ? true : data.isDefault ?? false;
  if (isDefault) await repo.unsetOtherDefaults();
  return repo.createWarehouse({ ...data, isDefault });
}

export async function update(id: string, body: unknown) {
  const data = warehouseUpdateSchema.parse(body);
  const existing = await repo.findById(id);
  if (!existing) throw new Error("Склад не найден");
  if (data.isDefault) await repo.unsetOtherDefaults(id);
  return repo.updateWarehouse(id, data);
}

export async function archive(id: string) {
  const existing = await repo.findById(id);
  if (!existing) throw new Error("Склад не найден");
  if (existing.isDefault) {
    throw new Error("Нельзя удалить основной склад. Сначала назначьте другой основным.");
  }
  return repo.archiveWarehouse(id);
}
