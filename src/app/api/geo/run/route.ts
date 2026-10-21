import { NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase/admin";
import { runSite } from "@/lib/geo/run";

export const runtime = "nodejs";
export const maxDuration = 300; // seconds — AI answers with web search are slow

/**
 * Starts a GEO run.
 *   GET /api/geo/run              → runs every active site (used by the weekly cron)
 *   GET /api/geo/run?site=<uuid>  → runs one site
 * Protected by CRON_SECRET: send header `Authorization: Bearer <CRON_SECRET>`.
 * (Vercel Cron sends this header automatically when CRON_SECRET is set.)
 */
export async function GET(req: Request) {
  const secret = process.env.CRON_SECRET;
  if (!secret || req.headers.get("authorization") !== `Bearer ${secret}`) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }

  const siteParam = new URL(req.url).searchParams.get("site");
  let siteIds: string[];
  if (siteParam) {
    siteIds = [siteParam];
  } else {
    const { data, error } = await supabaseAdmin().from("sites").select("id").eq("active", true);
    if (error) return NextResponse.json({ error: error.message }, { status: 500 });
    siteIds = (data ?? []).map((s) => s.id);
  }

  const results = [];
  for (const id of siteIds) {
    try {
      results.push(await runSite(id));
    } catch (e) {
      results.push({ site: id, error: e instanceof Error ? e.message : String(e) });
    }
  }
  return NextResponse.json({ ok: true, results });
}
