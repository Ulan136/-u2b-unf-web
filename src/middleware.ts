import { NextRequest, NextResponse } from "next/server";
import { SESSION_COOKIE, verifySession } from "@/lib/session";

// Пути, доступные без авторизации.
function isPublic(pathname: string): boolean {
  return (
    pathname === "/login" ||
    pathname.startsWith("/api/auth/") ||
    pathname.startsWith("/api/health")
  );
}

export async function middleware(req: NextRequest) {
  const secret = process.env.AUTH_SECRET;
  // Пока секрет не задан — авторизация выключена (безопасный откат, не блокируем).
  if (!secret) return NextResponse.next();

  const { pathname } = req.nextUrl;
  if (isPublic(pathname)) return NextResponse.next();

  const token = req.cookies.get(SESSION_COOKIE)?.value;
  const session = token ? await verifySession(token, secret) : null;

  if (!session) {
    if (pathname.startsWith("/api")) {
      return NextResponse.json(
        { ok: false, error: "Требуется вход в систему" },
        { status: 401 }
      );
    }
    const url = req.nextUrl.clone();
    url.pathname = "/login";
    return NextResponse.redirect(url);
  }

  return NextResponse.next();
}

// Не трогаем статику Next и иконку.
export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico).*)"],
};
