import { NextRequest } from "next/server";
import { shipOrder } from "@/services/customerOrder.service";
import { jsonOk, handleApiError } from "@/lib/errors";

type Ctx = { params: { id: string } };

// POST /api/customer-orders/[id]/ship → отгрузить заказ (списать товар со склада)
export async function POST(_req: NextRequest, { params }: Ctx) {
  try {
    return jsonOk(await shipOrder(params.id));
  } catch (e) {
    return handleApiError(e);
  }
}
