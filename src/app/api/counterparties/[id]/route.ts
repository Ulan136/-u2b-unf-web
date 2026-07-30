import { NextRequest } from "next/server";
import {
  getCounterparty,
  updateCounterparty,
  archiveCounterparty,
} from "@/services/counterparty.service";
import { jsonOk, handleApiError } from "@/lib/errors";

type Ctx = { params: { id: string } };

export async function GET(_req: NextRequest, { params }: Ctx) {
  try {
    return jsonOk(await getCounterparty(params.id));
  } catch (e) {
    return handleApiError(e);
  }
}

export async function PATCH(req: NextRequest, { params }: Ctx) {
  try {
    return jsonOk(await updateCounterparty(params.id, await req.json()));
  } catch (e) {
    return handleApiError(e);
  }
}

// DELETE = пометка на удаление (архив)
export async function DELETE(_req: NextRequest, { params }: Ctx) {
  try {
    return jsonOk(await archiveCounterparty(params.id));
  } catch (e) {
    return handleApiError(e);
  }
}
