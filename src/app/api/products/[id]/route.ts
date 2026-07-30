import { NextRequest } from "next/server";
import {
  getProduct,
  updateProduct,
  archiveProduct,
} from "@/services/nomenclature.service";
import { jsonOk, handleApiError } from "@/lib/errors";

type Ctx = { params: { id: string } };

// GET /api/products/[id] → карточка товара
export async function GET(_req: NextRequest, { params }: Ctx) {
  try {
    return jsonOk(await getProduct(params.id));
  } catch (e) {
    return handleApiError(e);
  }
}

// PATCH /api/products/[id] → сохранить изменения карточки
export async function PATCH(req: NextRequest, { params }: Ctx) {
  try {
    const body = await req.json();
    return jsonOk(await updateProduct(params.id, body));
  } catch (e) {
    return handleApiError(e);
  }
}

// DELETE /api/products/[id] → пометка на удаление (архив)
export async function DELETE(_req: NextRequest, { params }: Ctx) {
  try {
    return jsonOk(await archiveProduct(params.id));
  } catch (e) {
    return handleApiError(e);
  }
}
