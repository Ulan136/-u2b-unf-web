import { NextRequest } from "next/server";
import { stockReport } from "@/services/report.service";
import { jsonOk, handleApiError } from "@/lib/errors";

// GET /api/reports/stock?warehouseId=&q=&onlyNonZero=1 → отчёт «Остатки товаров»
export async function GET(req: NextRequest) {
  try {
    const sp = new URL(req.url).searchParams;
    const data = await stockReport({
      warehouseId: sp.get("warehouseId") ?? undefined,
      q: sp.get("q") ?? undefined,
      onlyNonZero: sp.get("onlyNonZero") === "1",
    });
    return jsonOk(data);
  } catch (e) {
    return handleApiError(e);
  }
}
