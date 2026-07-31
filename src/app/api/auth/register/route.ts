import { NextRequest, NextResponse } from "next/server";
import { register } from "@/services/auth.service";
import { SESSION_COOKIE } from "@/lib/session";
import { handleApiError } from "@/lib/errors";

// POST /api/auth/register → создать первого администратора (только если пользователей нет)
export async function POST(req: NextRequest) {
  try {
    const { user, token } = await register(await req.json());
    const res = NextResponse.json({ ok: true, data: { user } }, { status: 201 });
    res.cookies.set(SESSION_COOKIE, token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax",
      path: "/",
      maxAge: 60 * 60 * 24 * 7,
    });
    return res;
  } catch (e) {
    return handleApiError(e);
  }
}
