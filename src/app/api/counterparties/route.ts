import { NextRequest } from "next/server";
import { getDirectory, createCounterparty } from "@/services/counterparty.service";
import { jsonOk, handleApiError } from "@/lib/errors";

// GET /api/counterparties?groupId=&q= → содержимое папки: { groups, items }
export async function GET(req: NextRequest) {
  try {
    const sp = new URL(req.url).searchParams;
    const groupId = sp.get("groupId"); // null = корень
    const q = sp.get("q") ?? undefined;
    return jsonOk(await getDirectory(groupId, q));
  } catch (e) {
    return handleApiError(e);
  }
}

// POST /api/counterparties → создать контрагента
export async function POST(req: NextRequest) {
  try {
    return jsonOk(await createCounterparty(await req.json()), { status: 201 });
  } catch (e) {
    return handleApiError(e);
  }
}
