import { z } from "zod";
import * as repo from "@/repositories/money.repo";

/** Бизнес-логика блока «Деньги» (счета/кассы и операции). */

export const accountCreateSchema = z.object({
  name: z.string().min(1, "Название обязательно").max(200),
  kind: z.enum(["Касса", "Банк"]).optional(),
  isDefault: z.boolean().optional(),
});
export const accountUpdateSchema = accountCreateSchema.partial();

export const operationCreateSchema = z.object({
  kind: z.enum(["Приход", "Расход"]),
  accountId: z.string().uuid("Выберите счёт/кассу"),
  counterpartyId: z.string().uuid().optional().nullable(),
  amount: z.coerce.number().positive("Сумма должна быть > 0"),
  opDate: z.coerce.date().optional(),
  comment: z.string().optional().nullable(),
});

// ── Счета ───────────────────────────────────────────────
export function listAccounts(includeArchived = false) {
  return repo.listAccounts(includeArchived);
}

export async function createAccount(body: unknown) {
  const data = accountCreateSchema.parse(body);
  const existing = await repo.listAccounts(true);
  const isDefault = existing.length === 0 ? true : data.isDefault ?? false;
  if (isDefault) await repo.unsetOtherDefaults();
  return repo.createAccount({ ...data, isDefault });
}

export async function updateAccount(id: string, body: unknown) {
  const data = accountUpdateSchema.parse(body);
  const existing = await repo.findAccount(id);
  if (!existing) throw new Error("Счёт не найден");
  if (data.isDefault) await repo.unsetOtherDefaults(id);
  return repo.updateAccount(id, data);
}

export async function archiveAccount(id: string) {
  const existing = await repo.findAccount(id);
  if (!existing) throw new Error("Счёт не найден");
  return repo.archiveAccount(id);
}

// ── Операции ────────────────────────────────────────────
export function listOperations(opts: {
  accountId?: string;
  from?: string;
  to?: string;
}) {
  const from = opts.from ? new Date(`${opts.from}T00:00:00`) : undefined;
  let to: Date | undefined;
  if (opts.to) {
    to = new Date(`${opts.to}T00:00:00`);
    to.setDate(to.getDate() + 1); // верхняя граница включительно по дню
  }
  return repo.listOperations({ accountId: opts.accountId, from, to, limit: 200 });
}

export async function createOperation(body: unknown) {
  const data = operationCreateSchema.parse(body);
  const account = await repo.findAccount(data.accountId);
  if (!account) throw new Error("Счёт/касса не найдены");
  return repo.createOperation({
    kind: data.kind,
    accountId: data.accountId,
    counterpartyId: data.counterpartyId ?? null,
    amount: data.amount.toFixed(2),
    opDate: data.opDate,
    comment: data.comment ?? null,
  });
}
