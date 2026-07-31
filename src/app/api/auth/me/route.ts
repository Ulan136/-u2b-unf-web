import { cookies } from "next/headers";
import { NextResponse } from "next/server";
import { status } from "@/services/auth.service";
import { SESSION_COOKIE, verifySession } from "@/lib/session";
import { handleApiError } from "@/lib/errors";

// GET /api/auth/me → текущий пользователь (из куки) + нужна ли первичная настройка
export async function GET() {
  try {
    const { needsSetup } = await status();
    const token = cookies().get(SESSION_COOKIE)?.value;
    const secret = process.env.AUTH_SECRET;
    let user = null;
    if (token && secret) {
      const s = await verifySession(token, secret);
      if (s) user = { id: s.sub, username: s.username, name: s.name, role: s.role };
    }
    return NextResponse.json({ ok: true, data: { user, needsSetup } });
  } catch (e) {
    return handleApiError(e);
  }
}
