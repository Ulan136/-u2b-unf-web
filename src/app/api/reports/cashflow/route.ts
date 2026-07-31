import { NextRequest } from "next/server";
import { cashFlowReport } from "@/services/report.service";
import { jsonOk, handleApiError } from "@/lib/errors";

// GET /api/reports/cashflow?from=&to= → отчёт «Движение денег»
export async function GET(req: NextRequest) {
  try {
    const sp = new URL(req.url).searchParams;
    const data = await cashFlowReport({
      from: sp.get("from") ?? undefined,
      to: sp.get("to") ?? undefined,
    });
    return jsonOk(data);
  } catch (e) {
    return handleApiError(e);
  }
}
