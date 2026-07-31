import { z } from "zod";
import * as repo from "@/repositories/organizations.repo";

/** Бизнес-логика справочника «Организации». */

const baseFields = {
  name: z.string().min(1, "Наименование обязательно").max(300),
  fullName: z.string().optional().nullable(),
  bin: z.string().optional().nullable(),
  address: z.string().optional().nullable(),
  phone: z.string().optional().nullable(),
  email: z.string().optional().nullable(),
  director: z.string().optional().nullable(),
  bankName: z.string().optional().nullable(),
  bankAccount: z.string().optional().nullable(),
  bankBik: z.string().optional().nullable(),
  isDefault: z.boolean().optional(),
};

export const organizationCreateSchema = z.object(baseFields);
export const organizationUpdateSchema = z.object(baseFields).partial();

export function list(includeArchived = false) {
  return repo.listOrganizations(includeArchived);
}

export async function getById(id: string) {
  const row = await repo.findById(id);
  if (!row) throw new Error("Организация не найдена");
  return row;
}

export async function create(body: unknown) {
  const data = organizationCreateSchema.parse(body);
  const existing = await repo.listOrganizations(true);
  const isDefault = existing.length === 0 ? true : data.isDefault ?? false;
  if (isDefault) await repo.unsetOtherDefaults();
  return repo.createOrganization({ ...data, isDefault });
}

export async function update(id: string, body: unknown) {
  const data = organizationUpdateSchema.parse(body);
  const existing = await repo.findById(id);
  if (!existing) throw new Error("Организация не найдена");
  if (data.isDefault) await repo.unsetOtherDefaults(id);
  return repo.updateOrganization(id, data);
}

export async function archive(id: string) {
  const existing = await repo.findById(id);
  if (!existing) throw new Error("Организация не найдена");
  return repo.archiveOrganization(id);
}
