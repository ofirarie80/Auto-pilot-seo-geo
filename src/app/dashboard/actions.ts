"use server";

import { redirect } from "next/navigation";
import { supabaseUser } from "@/lib/supabase/server";
import { supabaseAdmin } from "@/lib/supabase/admin";
import { runSite } from "@/lib/geo/run";
import { runAudit } from "@/lib/audit/run";

/** "Run now" from the dashboard. Access is checked as the user; the run itself respects the plan quota. */
export async function runNow(f: FormData) {
  const siteId = String(f.get("site_id") ?? "");
  const orgId = String(f.get("org_id") ?? "");
  const back = (msg: string) => redirect(`/dashboard?org=${orgId}&site=${siteId}&msg=${encodeURIComponent(msg)}`);

  const db = await supabaseUser();
  const { data: site } = await db.from("sites").select("id").eq("id", siteId).maybeSingle();
  if (!site) back("האתר לא נמצא בחשבון שלכם.");

  const { data: recent } = await supabaseAdmin()
    .from("geo_runs").select("id").eq("site_id", siteId)
    .gte("started_at", new Date(Date.now() - 10 * 60_000).toISOString()).limit(1);
  if (recent?.length) back("בדיקה כבר רצה בדקות האחרונות. נסו שוב עוד כמה דקות.");

  let msg = "";
  try {
    await runAudit(siteId).catch(() => null);
    const r = await runSite(siteId);
    msg = `הבדיקה הסתיימה: ${r.answers} תשובות.` + (r.skippedForQuota ? ` ${r.skippedForQuota} שאלות דולגו כי נגמרה המכסה החודשית.` : "");
  } catch (e) {
    const m = e instanceof Error ? e.message : "";
    msg = m === "quota_exhausted" ? "נגמרה המכסה החודשית של המסלול. היא מתחדשת בתחילת החודש, או שאפשר לשדרג."
      : m.startsWith("No active prompts") ? "אין שאלות פעילות לאתר. מוסיפים אותן במסך ההגדרות."
      : "הבדיקה נכשלה. נסו שוב מאוחר יותר.";
  }
  back(msg);
}
