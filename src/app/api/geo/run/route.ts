import { NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase/admin";
import { runSite } from "@/lib/geo/run";
import { getSiteReport, reportText } from "@/lib/geo/report";
import { sendWhatsApp } from "@/lib/notify/whatsapp";
import { runAudit } from "@/lib/audit/run";

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
  const messages: string[] = [];
  for (const id of siteIds) {
    // Technical audit first: cheap, needs no API keys, and runs even for sites without prompts.
    const audit = await runAudit(id).catch((e) => ({ error: e instanceof Error ? e.message : String(e) }));
    if ("score" in audit) messages.push(`🛠️ ${audit.site} · ציון טכני ל-AI: ${audit.score}/100`);
    try {
      const summary = await runSite(id);
      results.push(summary);
      const report = await getSiteReport(id);
      if (report?.hasData) messages.push(reportText(report));
    } catch (e) {
      results.push({ site: id, error: e instanceof Error ? e.message : String(e) });
    }
  }

  const base = process.env.NEXT_PUBLIC_APP_URL?.replace(/\/$/, "");
  const whatsapp = messages.length
    ? await sendWhatsApp(messages.join("\n\n") + (base ? `\n\n${base}/dashboard` : ""))
    : { sent: false, error: "no results" };

  return NextResponse.json({ ok: true, results, whatsapp });
}
