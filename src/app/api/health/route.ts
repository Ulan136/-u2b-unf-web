import { sql } from "drizzle-orm";
import { getDb } from "@/lib/db";
import { jsonOk, handleApiError } from "@/lib/errors";

// Проверка живости приложения и подключения к БД.
export async function GET() {
  try {
    const db = getDb();
    await db.execute(sql`select 1`);
    return jsonOk({ status: "ok", db: "connected" });
  } catch (e) {
    return handleApiError(e);
  }
}
