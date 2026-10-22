"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { supabaseUser } from "@/lib/supabase/server";
import { planLimitMessage } from "@/lib/plans";
import { cleanDomain } from "@/lib/domain";
import { runAudit } from "@/lib/audit/run";

// Every write goes through the signed-in user's client: RLS rejects anything outside their organization,
// and database triggers enforce the plan's limits.

const str = (f: FormData, k: string) => String(f.get(k) ?? "").trim();
const terms = (s: string) => s.split(/[,،\n]/).map((t) => t.trim()).filter(Boolean);

function back(f: FormData, msg?: string): never {
  const q = new URLSearchParams();
  if (str(f, "org_id")) q.set("org", str(f, "org_id"));
  if (str(f, "site_id")) q.set("site", str(f, "site_id"));
  if (msg) q.set("msg", msg);
  revalidatePath("/dashboard/settings");
  redirect(`/dashboard/settings?${q}`);
}

const failed = (m?: string) => planLimitMessage(m) ?? "השמירה נכשלה. נסו שוב.";

export async function addSite(f: FormData) {
  const domain = cleanDomain(str(f, "domain"));
  const name = str(f, "name");
  if (!domain || !name) back(f, "צריך שם מותג וכתובת אתר תקינה.");
  const db = await supabaseUser();
  const { data, error } = await db
    .from("sites")
    .insert({ org_id: str(f, "org_id"), name, domain, brand_terms: [name] })
    .select("id")
    .single();
  if (error || !data) back(f, failed(error?.message));
  await runAudit(data.id).catch(() => null);
  f.set("site_id", data.id);
  back(f, "האתר נוסף. עכשיו מוסיפים לו שאלות.");
}

export async function addPrompt(f: FormData) {
  const text = str(f, "text");
  if (text.length < 5) back(f, "השאלה קצרה מדי.");
  const db = await supabaseUser();
  const { error } = await db.from("prompts").insert({ site_id: str(f, "site_id"), text, topic: str(f, "topic") || null });
  back(f, error ? failed(error.message) : undefined);
}

export async function togglePrompt(f: FormData) {
  const db = await supabaseUser();
  const { error } = await db.from("prompts").update({ active: str(f, "active") !== "true" }).eq("id", str(f, "id"));
  back(f, error ? failed(error.message) : undefined);
}

export async function deletePrompt(f: FormData) {
  const db = await supabaseUser();
  await db.from("prompts").delete().eq("id", str(f, "id"));
  back(f);
}

export async function addCompetitor(f: FormData) {
  const name = str(f, "name");
  if (!name) back(f, "צריך שם מתחרה.");
  const domain = cleanDomain(str(f, "domain"));
  const db = await supabaseUser();
  const { error } = await db
    .from("competitors")
    .insert({ site_id: str(f, "site_id"), name, domain, brand_terms: terms(str(f, "terms")) });
  back(f, error ? failed(error.message) : undefined);
}

export async function deleteCompetitor(f: FormData) {
  const db = await supabaseUser();
  await db.from("competitors").delete().eq("id", str(f, "id"));
  back(f);
}

export async function updateBrandTerms(f: FormData) {
  const db = await supabaseUser();
  const { error } = await db.from("sites").update({ brand_terms: terms(str(f, "terms")) }).eq("id", str(f, "site_id"));
  back(f, error ? failed(error.message) : "נשמר.");
}

export async function updateNotifications(f: FormData) {
  const db = await supabaseUser();
  const phone = str(f, "whatsapp_to").replace(/\D/g, "").replace(/^0/, "972");
  const { error } = await db
    .from("organizations")
    .update({ notify_email: f.get("notify_email") === "on", whatsapp_to: phone || null })
    .eq("id", str(f, "org_id"));
  back(f, error ? "רק בעלי החשבון יכולים לשנות את ההגדרות האלה." : "נשמר.");
}

// ───────── Google Search Console ─────────

export async function setGscProperty(f: FormData) {
  const { canManageGoogle } = await import("@/lib/google/access");
  const { supabaseAdmin } = await import("@/lib/supabase/admin");
  const orgId = str(f, "org_id");
  const access = await canManageGoogle(orgId);
  if (!access.ok) back(f, "רק בעלי החשבון יכולים לשנות את זה.");
  const prop = str(f, "gsc_property");
  const admin = supabaseAdmin();
  const { data: conn } = await admin.from("google_connections").select("properties").eq("org_id", orgId).maybeSingle();
  if (prop && !conn?.properties?.includes(prop)) back(f, "הנכס הזה לא שייך לחשבון הגוגל המחובר.");
  // Update through the user's client so RLS confirms the site belongs to this org.
  const db = await supabaseUser();
  const { error } = await db.from("sites").update({ gsc_property: prop || null }).eq("id", str(f, "site_id")).eq("org_id", orgId);
  if (error) back(f, "השמירה נכשלה.");
  if (prop) {
    const { syncSite } = await import("@/lib/google/sync");
    await syncSite(str(f, "site_id")).catch(() => null);
  }
  back(f, prop ? "נשמר, והנתונים מגוגל נמשכו." : "הקישור לנכס הוסר.");
}

export async function syncGscNow(f: FormData) {
  const db = await supabaseUser();
  const { data: site } = await db.from("sites").select("id, gsc_synced_at").eq("id", str(f, "site_id")).maybeSingle();
  if (!site) back(f, "האתר לא נמצא.");
  if (site.gsc_synced_at && Date.now() - new Date(site.gsc_synced_at).getTime() < 10 * 60_000) back(f, "הנתונים עודכנו לפני פחות מעשר דקות.");
  const { syncSite } = await import("@/lib/google/sync");
  const r = await syncSite(site.id).catch((e) => (e instanceof Error ? e.message : "error"));
  back(f, typeof r === "string" ? "משיכת הנתונים מגוגל נכשלה. נסו לחבר מחדש את Google." : "הנתונים מגוגל עודכנו.");
}

export async function disconnectGoogle(f: FormData) {
  const { canManageGoogle } = await import("@/lib/google/access");
  const { supabaseAdmin } = await import("@/lib/supabase/admin");
  const orgId = str(f, "org_id");
  const access = await canManageGoogle(orgId);
  if (!access.ok) back(f, "רק בעלי החשבון יכולים לנתק.");
  await supabaseAdmin().from("google_connections").delete().eq("org_id", orgId);
  back(f, "Google נותק.");
}
