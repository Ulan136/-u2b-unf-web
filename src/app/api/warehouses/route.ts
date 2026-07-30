import { NextRequest } from "next/server";
import { list, create } from "@/services/warehouses.service";
import { jsonOk, handleApiError } from "@/lib/errors";

// GET /api/warehouses?all=1 → список складов (all=1 — включая архивные)
export async function GET(req: NextRequest) {
  try {
    const all = new URL(req.url).searchParams.get("all") === "1";
    return jsonOk(await list(all));
  } catch (e) {
    return handleApiError(e);
  }
}

// POST /api/warehouses → создать склад
export async function POST(req: NextRequest) {
  try {
    return jsonOk(await create(await req.json()), { status: 201 });
  } catch (e) {
    return handleApiError(e);
  }
}
