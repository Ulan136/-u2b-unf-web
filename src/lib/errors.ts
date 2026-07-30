import { NextResponse } from "next/server";
import { ZodError } from "zod";

export function jsonOk<T>(data: T, init?: ResponseInit) {
  return NextResponse.json({ ok: true, data }, init);
}

export function jsonError(message: string, status = 400, extra?: Record<string, unknown>) {
  return NextResponse.json({ ok: false, error: message, ...extra }, { status });
}

export function handleApiError(err: unknown) {
  if (err instanceof ZodError) {
    return jsonError("Некорректные данные", 400, {
      issues: err.issues.map((i) => ({ path: i.path.join("."), message: i.message })),
    });
  }
  const msg = err instanceof Error ? err.message : "Внутренняя ошибка";
  if (msg.includes("DATABASE_URL")) {
    return jsonError(msg, 503);
  }
  console.error("[api]", err);
  return jsonError(msg, 500);
}
