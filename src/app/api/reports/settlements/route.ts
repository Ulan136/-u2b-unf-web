import { getSettlements } from "@/services/settlement.service";
import { jsonOk, handleApiError } from "@/lib/errors";

// Отчёт зависит от текущих данных — не кэшируем (иначе GET-роут статичен).
export const dynamic = "force-dynamic";

// GET /api/reports/settlements → взаиморасчёты по контрагентам
export async function GET() {
  try {
    return jsonOk(await getSettlements());
  } catch (e) {
    return handleApiError(e);
  }
}
