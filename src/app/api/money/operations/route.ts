import { NextRequest } from "next/server";
import { listOperations, createOperation } from "@/services/money.service";
import { jsonOk, handleApiError } from "@/lib/errors";

// GET /api/money/operations?accountId=&from=&to= → список операций
export async function GET(req: NextRequest) {
  try {
    const sp = new URL(req.url).searchParams;
    return jsonOk(
      await listOperations({
        accountId: sp.get("accountId") ?? undefined,
        from: sp.get("from") ?? undefined,
        to: sp.get("to") ?? undefined,
      })
    );
  } catch (e) {
    return handleApiError(e);
  }
}

// POST /api/money/operations → приход/расход денег
export async function POST(req: NextRequest) {
  try {
    return jsonOk(await createOperation(await req.json()), { status: 201 });
  } catch (e) {
    return handleApiError(e);
  }
}
