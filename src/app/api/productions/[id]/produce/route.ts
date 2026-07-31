import { NextRequest } from "next/server";
import { produce } from "@/services/production.service";
import { jsonOk, handleApiError } from "@/lib/errors";

type Ctx = { params: { id: string } };

// POST /api/productions/[id]/produce → провести производство (списать материалы, выпустить изделие)
export async function POST(_req: NextRequest, { params }: Ctx) {
  try {
    return jsonOk(await produce(params.id));
  } catch (e) {
    return handleApiError(e);
  }
}
