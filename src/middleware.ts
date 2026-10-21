import { NextResponse, type NextRequest } from "next/server";

/**
 * Password-protects the dashboard with HTTP Basic Auth until real user login exists.
 * Set DASHBOARD_PASSWORD in Vercel (any username works). Without it the dashboard is closed.
 */
export function middleware(req: NextRequest) {
  const password = process.env.DASHBOARD_PASSWORD;
  const auth = req.headers.get("authorization") ?? "";
  if (password && auth.startsWith("Basic ")) {
    try {
      const decoded = atob(auth.slice(6));
      const pass = decoded.slice(decoded.indexOf(":") + 1);
      if (pass === password) return NextResponse.next();
    } catch {
      /* fall through */
    }
  }
  return new NextResponse(password ? "נדרשת סיסמה" : "יש להגדיר DASHBOARD_PASSWORD ב-Vercel", {
    status: 401,
    headers: password ? { "WWW-Authenticate": 'Basic realm="Lionet Pilot", charset="UTF-8"' } : {},
  });
}

export const config = { matcher: ["/dashboard/:path*"] };
