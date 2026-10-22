import { NextResponse, type NextRequest } from "next/server";
import { randomBytes } from "node:crypto";
import { authUrl, googleConfigured } from "@/lib/google/oauth";
import { canManageGoogle } from "@/lib/google/access";

export const runtime = "nodejs";

export async function GET(req: NextRequest) {
  const orgId = req.nextUrl.searchParams.get("org") ?? "";
  const back = (msg: string) =>
    NextResponse.redirect(new URL(`/dashboard/settings?org=${orgId}&msg=${encodeURIComponent(msg)}`, req.nextUrl.origin));

  if (!googleConfigured()) return back("החיבור לגוגל עוד לא הוגדר במערכת.");
  const access = await canManageGoogle(orgId);
  if (!access.ok) {
    return back(access.reason === "plan" ? "Search Console כלול במסלולי Pro ומעלה." : "רק בעלי החשבון יכולים לחבר את Google.");
  }

  const nonce = randomBytes(16).toString("hex");
  const res = NextResponse.redirect(authUrl(`${nonce}.${orgId}`));
  res.cookies.set("g_oauth", `${nonce}.${orgId}`, {
    httpOnly: true, secure: true, sameSite: "lax", path: "/api/google", maxAge: 600,
  });
  return res;
}
