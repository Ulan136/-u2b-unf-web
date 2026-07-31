import { NextRequest } from "next/server";
import { receiveReceipt } from "@/services/receipt.service";
import { jsonOk, handleApiError } from "@/lib/errors";

type Ctx = { params: { id: string } };

// POST /api/receipts/[id]/receive → оприходовать (приход товара на склад)
export async function POST(_req: NextRequest, { params }: Ctx) {
  try {
    return jsonOk(await receiveReceipt(params.id));
  } catch (e) {
    return handleApiError(e);
  }
}
