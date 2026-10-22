import "server-only";
import type { SupabaseClient } from "@supabase/supabase-js";
import { supabaseAdmin } from "@/lib/supabase/admin";
import { auditSite, type AuditResult, type Check } from "./geo-audit";

export async function runAudit(siteId: string): Promise<AuditResult & { site: string }> {
  const db = supabaseAdmin();
  const { data: site, error } = await db.from("sites").select("name, domain").eq("id", siteId).single();
  if (error || !site) throw new Error(`Site not found: ${siteId}`);
  const result = await auditSite(site.domain);
  await db.from("site_audits").insert({ site_id: siteId, score: result.score, checks: result.checks });
  return { ...result, site: site.name };
}

export async function latestAudit(db: SupabaseClient, siteId: string) {
  const { data } = await db
    .from("site_audits")
    .select("score, checks, created_at")
    .eq("site_id", siteId)
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle();
  return data as { score: number; checks: Check[]; created_at: string } | null;
}
