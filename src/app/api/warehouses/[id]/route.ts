import { NextRequest } from "next/server";
import { getById, update, archive } from "@/services/warehouses.service";
import { jsonOk, handleApiError } from "@/lib/errors";

type Ctx = { params: { id: string } };

export async function GET(_req: NextRequest, { params }: Ctx) {
  try {
    return jsonOk(await getById(params.id));
  } catch (e) {
    return handleApiError(e);
  }
}

export async function PATCH(req: NextRequest, { params }: Ctx) {
  try {
    return jsonOk(await update(params.id, await req.json()));
  } catch (e) {
    return handleApiError(e);
  }
}

export async function DELETE(_req: NextRequest, { params }: Ctx) {
  try {
    return jsonOk(await archive(params.id));
  } catch (e) {
    return handleApiError(e);
  }
}
