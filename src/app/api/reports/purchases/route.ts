import { NextRequest } from "next/server";
import { purchaseReport } from "@/services/report.service";
import { jsonOk, handleApiError } from "@/lib/errors";

// GET /api/reports/purchases?from=YYYY-MM-DD&to=YYYY-MM-DD → отчёт «Закупки»
export async function GET(req: NextRequest) {
  try {
    const sp = new URL(req.url).searchParams;
    const data = await purchaseReport({
      from: sp.get("from") ?? undefined,
      to: sp.get("to") ?? undefined,
    });
    return jsonOk(data);
  } catch (e) {
    return handleApiError(e);
  }
}
