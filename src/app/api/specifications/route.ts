import { NextRequest } from "next/server";
import { list, create } from "@/services/specification.service";
import { jsonOk, handleApiError } from "@/lib/errors";

// GET /api/specifications → список спецификаций
export async function GET() {
  try {
    return jsonOk(await list());
  } catch (e) {
    return handleApiError(e);
  }
}

// POST /api/specifications → создать спецификацию
export async function POST(req: NextRequest) {
  try {
    return jsonOk(await create(await req.json()), { status: 201 });
  } catch (e) {
    return handleApiError(e);
  }
}
