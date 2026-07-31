import { NextRequest } from "next/server";
import { salesReport } from "@/services/report.service";
import { jsonOk, handleApiError } from "@/lib/errors";

// GET /api/reports/sales?from=YYYY-MM-DD&to=YYYY-MM-DD → отчёт «Продажи»
export async function GET(req: NextRequest) {
  try {
    const sp = new URL(req.url).searchParams;
    const data = await salesReport({
      from: sp.get("from") ?? undefined,
      to: sp.get("to") ?? undefined,
    });
    return jsonOk(data);
  } catch (e) {
    return handleApiError(e);
  }
}
