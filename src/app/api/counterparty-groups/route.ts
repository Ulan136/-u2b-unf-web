import { NextRequest } from "next/server";
import { listGroups, createGroup } from "@/services/counterparty.service";
import { jsonOk, handleApiError } from "@/lib/errors";

// GET /api/counterparty-groups?parentId= → группы внутри родителя (null = корень)
export async function GET(req: NextRequest) {
  try {
    const parentId = new URL(req.url).searchParams.get("parentId");
    return jsonOk(await listGroups(parentId));
  } catch (e) {
    return handleApiError(e);
  }
}

// POST /api/counterparty-groups → создать группу
export async function POST(req: NextRequest) {
  try {
    return jsonOk(await createGroup(await req.json()), { status: 201 });
  } catch (e) {
    return handleApiError(e);
  }
}
