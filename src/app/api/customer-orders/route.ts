import { NextRequest } from "next/server";
import { list, create } from "@/services/customerOrder.service";
import { jsonOk, handleApiError } from "@/lib/errors";

// GET /api/customer-orders → список заказов покупателей
export async function GET() {
  try {
    return jsonOk(await list());
  } catch (e) {
    return handleApiError(e);
  }
}

// POST /api/customer-orders → создать заказ
export async function POST(req: NextRequest) {
  try {
    return jsonOk(await create(await req.json()), { status: 201 });
  } catch (e) {
    return handleApiError(e);
  }
}
