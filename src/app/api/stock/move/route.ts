import { NextRequest } from "next/server";
import { postMove } from "@/services/warehouse.service";
import { jsonOk, handleApiError } from "@/lib/errors";

// POST /api/stock/move → движение склада (приход/расход/резерв/перемещение/инвентаризация).
export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const move = await postMove(body);
    return jsonOk(move, { status: 201 });
  } catch (e) {
    return handleApiError(e);
  }
}
