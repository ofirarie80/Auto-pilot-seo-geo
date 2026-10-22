"use server";

import { redirect } from "next/navigation";
import { headers } from "next/headers";
import { after } from "next/server";
import { supabaseUser } from "@/lib/supabase/server";
import { startCrawl, chainStep } from "@/lib/crawl/crawl";

async function origin() {
  const h = await headers();
  const host = h.get("x-forwarded-host") ?? h.get("host");
  return `${h.get("x-forwarded-proto") ?? "https"}://${host}`;
}

/** Starts a full-site crawl. Membership is checked with the user's client; the crawl itself runs on the server. */
export async function startCrawlAction(f: FormData) {
  const siteId = String(f.get("site_id") ?? "");
  const orgId = String(f.get("org_id") ?? "");
  const back = (msg?: string) => redirect(`/dashboard/crawl?org=${orgId}&site=${siteId}${msg ? `&msg=${encodeURIComponent(msg)}` : ""}`);
  const db = await supabaseUser();
  const { data: site } = await db.from("sites").select("id").eq("id", siteId).maybeSingle();
  if (!site) back("האתר לא נמצא בחשבון שלכם.");
  const { data: last } = await db.from("site_crawls").select("started_at").eq("site_id", siteId).order("started_at", { ascending: false }).limit(1).maybeSingle();
  if (last && Date.now() - new Date(last.started_at).getTime() < 10 * 60_000) back("סריקה התחילה לפני פחות מ-10 דקות.");
  let id = "";
  try {
    id = await startCrawl(siteId);
  } catch {
    back("לא הצלחנו להתחיל את הסריקה. נסו שוב.");
  }
  const o = await origin();
  after(() => chainStep(o, id));
  back();
}

/** Restarts a stalled crawl (e.g. a step that was cut off). Safe to call often: a step claims the crawl first. */
export async function nudgeCrawl(siteId: string, crawlId: string) {
  const db = await supabaseUser();
  const { data } = await db.from("site_crawls").select("id, status, step_at").eq("id", crawlId).eq("site_id", siteId).maybeSingle();
  if (!data || data.status !== "running") return;
  if (data.step_at && Date.now() - new Date(data.step_at).getTime() < 75_000) return;
  const o = await origin();
  after(() => chainStep(o, crawlId));
}
