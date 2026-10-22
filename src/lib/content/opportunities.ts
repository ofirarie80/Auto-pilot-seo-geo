import "server-only";
import type { SupabaseClient } from "@supabase/supabase-js";

export type Opportunity = {
  promptId: string;
  query: string;
  engines: number;          // engines that answered
  competitors: string[];
  citedDomains: string[];
  sampleAnswer: string | null;
};

const host = (u: string) => { try { return new URL(u).hostname.replace(/^www\./, ""); } catch { return null; } };

/**
 * Questions where, in the latest run, no AI engine mentioned the brand and no article exists yet.
 * Read through the caller's client so RLS keeps it to their own organization.
 */
export async function contentOpportunities(db: SupabaseClient, siteId: string): Promise<Opportunity[]> {
  const { data: run } = await db.from("geo_runs").select("id").eq("site_id", siteId).eq("status", "done")
    .order("started_at", { ascending: false }).limit(1).maybeSingle();
  if (!run) return [];
  const [{ data: results }, { data: prompts }, { data: items }] = await Promise.all([
    db.from("geo_results").select("prompt_id, engine, brand_mentioned, competitors_mentioned, cited_urls, answer")
      .eq("run_id", run.id).is("error", null),
    db.from("prompts").select("id, text").eq("site_id", siteId).eq("active", true),
    db.from("content_items").select("prompt_id, status").eq("site_id", siteId),
  ]);
  const covered = new Set((items ?? []).filter((i) => i.status !== "rejected").map((i) => i.prompt_id));
  return (prompts ?? [])
    .filter((p) => !covered.has(p.id))
    .map((p) => {
      const rs = (results ?? []).filter((r) => r.prompt_id === p.id);
      if (!rs.length || rs.some((r) => r.brand_mentioned)) return null;
      const domains = [...new Set(rs.flatMap((r) => (r.cited_urls ?? []).map(host)).filter((h): h is string => !!h && !h.includes("google.com")))];
      return {
        promptId: p.id, query: p.text, engines: rs.length,
        competitors: [...new Set(rs.flatMap((r) => r.competitors_mentioned ?? []))],
        citedDomains: domains.slice(0, 6),
        sampleAnswer: rs.find((r) => r.engine === "openai")?.answer ?? rs[0]?.answer ?? null,
      };
    })
    .filter((o): o is Opportunity => !!o);
}
