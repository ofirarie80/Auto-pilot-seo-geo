import { NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase/admin";
import { runAudit } from "@/lib/audit/run";

export const runtime = "nodejs";
export const maxDuration = 60;

/**
 * Technical AI-readiness audit only (no AI API calls).
 *   GET /api/audit/run              → every active site
 *   GET /api/audit/run?site=<uuid>  → one site
 * Protected by CRON_SECRET (header `Authorization: Bearer <CRON_SECRET>`).
 */
export async function GET(req: Request) {
  const secret = process.env.CRON_SECRET;
  if (!secret || req.headers.get("authorization") !== `Bearer ${secret}`) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }
  const one = new URL(req.url).searchParams.get("site");
  const ids = one
    ? [one]
    : ((await supabaseAdmin().from("sites").select("id").eq("active", true)).data ?? []).map((s) => s.id);
  const results = await Promise.all(
    ids.map((id) => runAudit(id).catch((e) => ({ site: id, error: e instanceof Error ? e.message : String(e) }))),
  );
  return NextResponse.json({ ok: true, results });
}
