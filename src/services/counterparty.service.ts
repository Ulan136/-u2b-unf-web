import { z } from "zod";
import * as repo from "@/repositories/counterparties.repo";

/** Бизнес-логика справочника «Контрагенты» (группы-папки + карточки). */

export const groupCreateSchema = z.object({
  name: z.string().min(1, "Название группы обязательно").max(200),
  parentId: z.string().uuid().nullable().optional(),
  code: z.string().optional(),
});

const baseFields = {
  name: z.string().min(1, "Наименование обязательно").max(300),
  fullName: z.string().optional().nullable(),
  legalType: z.enum(["Юридическое", "Физическое", "ИП"]).optional(),
  bin: z.string().optional().nullable(),
  isCustomer: z.boolean().optional(),
  isSupplier: z.boolean().optional(),
  groupId: z.string().uuid().optional().nullable(),
  phone: z.string().optional().nullable(),
  email: z.string().optional().nullable(),
  address: z.string().optional().nullable(),
  contactPerson: z.string().optional().nullable(),
  comment: z.string().optional().nullable(),
};

export const counterpartyCreateSchema = z.object(baseFields);
export const counterpartyUpdateSchema = z.object(baseFields).partial();

/** Содержимое папки справочника: подгруппы + карточки (или поиск по всем). */
export async function getDirectory(groupId: string | null, q?: string) {
  const [groups, items] = await Promise.all([
    q ? Promise.resolve([]) : repo.listGroups(groupId),
    repo.listCounterparties(q, { groupId }),
  ]);
  return { groups, items };
}

export function listGroups(parentId: string | null) {
  return repo.listGroups(parentId);
}

export async function createGroup(body: unknown) {
  const data = groupCreateSchema.parse(body);
  return repo.createGroup(data);
}

export async function createCounterparty(body: unknown) {
  const data = counterpartyCreateSchema.parse(body);
  return repo.createCounterparty(data);
}

export async function getCounterparty(id: string) {
  const row = await repo.findById(id);
  if (!row) throw new Error("Контрагент не найден");
  return row;
}

export async function updateCounterparty(id: string, body: unknown) {
  const data = counterpartyUpdateSchema.parse(body);
  const existing = await repo.findById(id);
  if (!existing) throw new Error("Контрагент не найден");
  return repo.updateCounterparty(id, data);
}

export async function archiveCounterparty(id: string) {
  const existing = await repo.findById(id);
  if (!existing) throw new Error("Контрагент не найден");
  return repo.archiveCounterparty(id);
}
