import { NextRequest } from "next/server";
import { getWarehouseBoard, addProduct } from "@/services/warehouse.service";
import { jsonOk, handleApiError } from "@/lib/errors";

// GET /api/products?q=  → доска склада: номенклатура с остатками + последние движения.
export async function GET(req: NextRequest) {
  try {
    const sp = new URL(req.url).searchParams;
    const q = sp.get("q") ?? undefined;
    const warehouseId = sp.get("warehouseId") ?? undefined;
    const board = await getWarehouseBoard(q, warehouseId);
    return jsonOk(board);
  } catch (e) {
    return handleApiError(e);
  }
}

// POST /api/products → создать номенклатуру.
export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const product = await addProduct(body);
    return jsonOk(product, { status: 201 });
  } catch (e) {
    return handleApiError(e);
  }
}
