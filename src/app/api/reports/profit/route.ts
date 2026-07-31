import { NextRequest } from "next/server";
import { profitReport } from "@/services/report.service";
import { jsonOk, handleApiError } from "@/lib/errors";

// GET /api/reports/profit?from=&to= → отчёт «Прибыль»
export async function GET(req: NextRequest) {
  try {
    const sp = new URL(req.url).searchParams;
    const data = await profitReport({
      from: sp.get("from") ?? undefined,
      to: sp.get("to") ?? undefined,
    });
    return jsonOk(data);
  } catch (e) {
    return handleApiError(e);
  }
}
