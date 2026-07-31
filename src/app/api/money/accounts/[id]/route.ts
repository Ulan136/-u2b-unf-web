import { NextRequest } from "next/server";
import { updateAccount, archiveAccount } from "@/services/money.service";
import { jsonOk, handleApiError } from "@/lib/errors";

type Ctx = { params: { id: string } };

export async function PATCH(req: NextRequest, { params }: Ctx) {
  try {
    return jsonOk(await updateAccount(params.id, await req.json()));
  } catch (e) {
    return handleApiError(e);
  }
}

export async function DELETE(_req: NextRequest, { params }: Ctx) {
  try {
    return jsonOk(await archiveAccount(params.id));
  } catch (e) {
    return handleApiError(e);
  }
}
