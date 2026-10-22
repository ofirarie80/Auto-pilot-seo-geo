import { NextResponse, type NextRequest } from "next/server";
import { exchangeCode, emailFromIdToken } from "@/lib/google/oauth";
import { listProperties, matchProperty } from "@/lib/google/gsc";
import { canManageGoogle } from "@/lib/google/access";
import { encrypt } from "@/lib/crypto";
import { supabaseAdmin } from "@/lib/supabase/admin";
import { syncSite } from "@/lib/google/sync";

export const runtime = "nodejs";
export const maxDuration = 60;

export async function GET(req: NextRequest) {
  const state = req.nextUrl.searchParams.get("state") ?? "";
  const code = req.nextUrl.searchParams.get("code");
  const cookie = req.cookies.get("g_oauth")?.value;
  const orgId = state.split(".")[1] ?? "";
  const back = (msg: string) => {
    const res = NextResponse.redirect(new URL(`/dashboard/settings?org=${orgId}&msg=${encodeURIComponent(msg)}`, req.nextUrl.origin));
    res.cookies.delete({ name: "g_oauth", path: "/api/google" });
    return res;
  };

  if (!code || !cookie || cookie !== state) return back("החיבור לגוגל בוטל או שפג תוקפו. נסו שוב.");
  const access = await canManageGoogle(orgId);
  if (!access.ok) return back("אין הרשאה לחבר את Google לחשבון הזה.");

  try {
    const tokens = await exchangeCode(code);
    if (!tokens.refresh_token) return back("גוגל לא החזיר הרשאה קבועה. נסו שוב ואשרו את כל ההרשאות.");
    const properties = await listProperties(tokens.access_token);
    const db = supabaseAdmin();
    await db.from("google_connections").upsert({
      org_id: orgId,
      google_email: emailFromIdToken(tokens.id_token),
      refresh_token_enc: encrypt(tokens.refresh_token),
      connected_by: access.userId,
      properties,
      updated_at: new Date().toISOString(),
    });

    // Auto-map sites to their Search Console property, then pull the first data.
    const { data: sites } = await db.from("sites").select("id, domain, gsc_property").eq("org_id", orgId);
    let mapped = 0;
    for (const s of sites ?? []) {
      const prop = s.gsc_property && properties.includes(s.gsc_property) ? s.gsc_property : matchProperty(s.domain, properties);
      if (!prop) continue;
      await db.from("sites").update({ gsc_property: prop }).eq("id", s.id);
      mapped++;
      await syncSite(s.id).catch(() => null);
    }
    return back(
      properties.length
        ? `Google חובר. נמצאו ${properties.length} נכסים ב-Search Console, ${mapped} אתרים קושרו אוטומטית.`
        : "Google חובר, אבל בחשבון הזה אין נכסים ב-Search Console.",
    );
  } catch {
    return back("החיבור לגוגל נכשל. נסו שוב.");
  }
}
