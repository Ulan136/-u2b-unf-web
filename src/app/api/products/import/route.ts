import { NextRequest } from "next/server";
import { importProducts } from "@/services/nomenclature.service";
import { jsonOk, handleApiError } from "@/lib/errors";

// POST /api/products/import → массовый импорт номенклатуры. Body: { rows: [...] }
export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const result = await importProducts(body?.rows);
    return jsonOk(result);
  } catch (e) {
    return handleApiError(e);
  }
}
