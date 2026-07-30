import { NextRequest } from "next/server";
import { getNomenclature } from "@/services/nomenclature.service";
import { jsonOk, handleApiError } from "@/lib/errors";

// GET /api/nomenclature?groupId=&q= → содержимое папки справочника: { groups, products }
export async function GET(req: NextRequest) {
  try {
    const sp = new URL(req.url).searchParams;
    const groupId = sp.get("groupId"); // null = корень
    const q = sp.get("q") ?? undefined;
    const data = await getNomenclature(groupId, q);
    return jsonOk(data);
  } catch (e) {
    return handleApiError(e);
  }
}
