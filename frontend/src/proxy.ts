import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

const PUBLIC_ROUTES = ["/login", "/register", "/"];
const ADMIN_ROUTES = ["/admin"];
const STUDENT_ROUTES = ["/student"];

function parseCookieToken(request: NextRequest): { role: string | null; username: string | null } {
  const token = request.cookies.get("auth_token")?.value;
  if (!token) return { role: null, username: null };
  try {
    const parts = token.split(".");
    if (parts.length !== 3) return { role: null, username: null };
    const payload = JSON.parse(atob(parts[1]));
    return { role: payload.role || null, username: payload.sub || null };
  } catch {
    return { role: null, username: null };
  }
}

export default function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl;
  const { role } = parseCookieToken(request);

  if (ADMIN_ROUTES.some((r) => pathname.startsWith(r))) {
    if (role !== "admin") {
      return NextResponse.redirect(new URL("/login", request.url));
    }
  }

  if (STUDENT_ROUTES.some((r) => pathname.startsWith(r))) {
    if (!role) {
      return NextResponse.redirect(new URL("/login", request.url));
    }
  }

  if (PUBLIC_ROUTES.some((r) => pathname === r)) {
    if (role) {
      const dashboard = role === "admin" ? "/admin" : "/student";
      return NextResponse.redirect(new URL(dashboard, request.url));
    }
  }

  return NextResponse.next();
}

export const config = {
  matcher: ["/admin/:path*", "/student/:path*", "/login", "/register", "/"],
};
