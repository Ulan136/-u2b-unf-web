import { NextRequest } from "next/server";
import { list, create } from "@/services/receipt.service";
import { jsonOk, handleApiError } from "@/lib/errors";

// GET /api/receipts → список поступлений
export async function GET() {
  try {
    return jsonOk(await list());
  } catch (e) {
    return handleApiError(e);
  }
}

// POST /api/receipts → создать поступление
export async function POST(req: NextRequest) {
  try {
    return jsonOk(await create(await req.json()), { status: 201 });
  } catch (e) {
    return handleApiError(e);
  }
}
