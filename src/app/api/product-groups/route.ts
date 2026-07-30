import { NextRequest } from "next/server";
import { listGroups, createGroup } from "@/services/nomenclature.service";
import { jsonOk, handleApiError } from "@/lib/errors";

// GET /api/product-groups?parentId= → список групп внутри родителя (null = корень)
export async function GET(req: NextRequest) {
  try {
    const parentId = new URL(req.url).searchParams.get("parentId");
    const groups = await listGroups(parentId);
    return jsonOk(groups);
  } catch (e) {
    return handleApiError(e);
  }
}

// POST /api/product-groups → создать группу
export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const group = await createGroup(body);
    return jsonOk(group, { status: 201 });
  } catch (e) {
    return handleApiError(e);
  }
}
