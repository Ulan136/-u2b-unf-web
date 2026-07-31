import { NextRequest } from "next/server";
import { list, create } from "@/services/purchaseOrder.service";
import { jsonOk, handleApiError } from "@/lib/errors";

// GET /api/purchase-orders → список заказов поставщикам
export async function GET() {
  try {
    return jsonOk(await list());
  } catch (e) {
    return handleApiError(e);
  }
}

// POST /api/purchase-orders → создать заказ поставщику
export async function POST(req: NextRequest) {
  try {
    return jsonOk(await create(await req.json()), { status: 201 });
  } catch (e) {
    return handleApiError(e);
  }
}
