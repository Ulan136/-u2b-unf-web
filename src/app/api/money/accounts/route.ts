import { NextRequest } from "next/server";
import { listAccounts, createAccount } from "@/services/money.service";
import { jsonOk, handleApiError } from "@/lib/errors";

// GET /api/money/accounts → счета/кассы с балансами
export async function GET() {
  try {
    return jsonOk(await listAccounts());
  } catch (e) {
    return handleApiError(e);
  }
}

// POST /api/money/accounts → создать счёт/кассу
export async function POST(req: NextRequest) {
  try {
    return jsonOk(await createAccount(await req.json()), { status: 201 });
  } catch (e) {
    return handleApiError(e);
  }
}
