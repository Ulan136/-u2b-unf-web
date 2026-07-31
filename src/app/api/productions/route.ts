import { NextRequest } from "next/server";
import { list, create } from "@/services/production.service";
import { jsonOk, handleApiError } from "@/lib/errors";

// GET /api/productions → список документов производства
export async function GET() {
  try {
    return jsonOk(await list());
  } catch (e) {
    return handleApiError(e);
  }
}

// POST /api/productions → создать документ производства
export async function POST(req: NextRequest) {
  try {
    return jsonOk(await create(await req.json()), { status: 201 });
  } catch (e) {
    return handleApiError(e);
  }
}
