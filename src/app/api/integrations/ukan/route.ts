import { NextRequest } from "next/server";
import { handleUkanEvent } from "@/services/warehouse.service";
import { jsonOk, jsonError, handleApiError } from "@/lib/errors";

// POST /api/integrations/ukan → вебхук от Юкан.
// Защита: заголовок X-Ukan-Secret должен совпасть с UKAN_WEBHOOK_SECRET.
export async function POST(req: NextRequest) {
  try {
    const expected = process.env.UKAN_WEBHOOK_SECRET;
    const provided = req.headers.get("x-ukan-secret");
    if (!expected || expected === "change-me-long-random") {
      return jsonError("UKAN_WEBHOOK_SECRET не настроен на сервере", 503);
    }
    if (provided !== expected) {
      return jsonError("Неверный секрет вебхука", 401);
    }
    const body = await req.json();
    const result = await handleUkanEvent(body);
    return jsonOk(result);
  } catch (e) {
    return handleApiError(e);
  }
}
