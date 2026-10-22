import "server-only";
import { supabaseAdmin } from "@/lib/supabase/admin";
import { analyze, type Brand } from "./analyze";
import { ask, enabledEngines, type EngineId } from "./engines";

/** Run a small async pool so we don't hammer the AI APIs. */
async function pool<T>(items: T[], size: number, fn: (t: T) => Promise<void>) {
  const queue = [...items];
  await Promise.all(
    Array.from({ length: Math.min(size, queue.length) }, async () => {
      while (queue.length) await fn(queue.shift()!);
    }),
  );
}

export type RunSummary = {
  runId: string;
  site: string;
  engines: EngineId[];
  answers: number;
  errors: number;
  mentionRate: number;
  citationRate: number;
  skippedForQuota: number;
};

/** One GEO run for one site: every active prompt × every configured engine. */
export async function runSite(siteId: string): Promise<RunSummary> {
  const db = supabaseAdmin();

  const { data: site, error: siteErr } = await db
    .from("sites")
    .select("id, name, domain, brand_terms, org_id, organizations(plan, plans(engines, monthly_answers))")
    .eq("id", siteId)
    .single();
  if (siteErr || !site) throw new Error(`Site not found: ${siteId}`);
  const orgPlan = (site.organizations as unknown as { plans: { engines: string[]; monthly_answers: number } | null } | null)?.plans;
  if (!orgPlan) throw new Error(`No plan for site ${site.name}`);

  const [{ data: prompts }, { data: comps }] = await Promise.all([
    db.from("prompts").select("id, text").eq("site_id", siteId).eq("active", true),
    db.from("competitors").select("name, domain, brand_terms").eq("site_id", siteId),
  ]);

  if (!prompts?.length) throw new Error(`No active prompts for ${site.name}`);

  // Plan limits: only the engines the plan includes, and only what is left of the monthly quota.
  const engines = enabledEngines().filter((e) => orgPlan.engines.includes(e));
  if (!engines.length) throw new Error("No AI engine available for this plan (missing API key or not included)");
  const { data: usage } = await db.from("org_usage").select("answers_this_month").eq("org_id", site.org_id).maybeSingle();
  const remaining = orgPlan.monthly_answers - Number(usage?.answers_this_month ?? 0);
  if (remaining <= 0) throw new Error("quota_exhausted");

  const { data: run, error: runErr } = await db
    .from("geo_runs")
    .insert({ site_id: siteId })
    .select("id")
    .single();
  if (runErr || !run) throw new Error(`Could not start run: ${runErr?.message}`);

  const brand: Brand = { name: site.name, domain: site.domain, terms: site.brand_terms ?? [] };
  const competitors: Brand[] = (comps ?? []).map((c) => ({
    name: c.name,
    domain: c.domain,
    terms: c.brand_terms ?? [],
  }));

  const allJobs = (prompts ?? []).flatMap((p) => engines.map((e) => ({ p, e })));
  const jobs = allJobs.slice(0, remaining);
  let ok = 0, errors = 0, mentioned = 0, cited = 0;

  await pool(jobs, Number(process.env.GEO_CONCURRENCY ?? 4), async ({ p, e }) => {
    try {
      const r = await ask(e, p.text);
      const a = analyze(r.answer, r.citedUrls, brand, competitors);
      await db.from("geo_results").insert({
        run_id: run.id,
        site_id: siteId,
        prompt_id: p.id,
        engine: e,
        model: r.model,
        answer: r.answer,
        cited_urls: r.citedUrls,
        brand_mentioned: a.brandMentioned,
        brand_cited: a.brandCited,
        mention_position: a.mentionPosition,
        competitors_mentioned: a.competitorsMentioned,
      });
      ok++;
      if (a.brandMentioned) mentioned++;
      if (a.brandCited) cited++;
    } catch (err) {
      errors++;
      await db.from("geo_results").insert({
        run_id: run.id, site_id: siteId, prompt_id: p.id, engine: e,
        error: err instanceof Error ? err.message.slice(0, 500) : String(err),
      });
    }
  });

  await db
    .from("geo_runs")
    .update({ status: ok ? "done" : "failed", finished_at: new Date().toISOString() })
    .eq("id", run.id);

  const pct = (n: number) => (ok ? Math.round((1000 * n) / ok) / 10 : 0);
  return {
    runId: run.id, site: site.name, engines, answers: ok, errors,
    mentionRate: pct(mentioned), citationRate: pct(cited), skippedForQuota: allJobs.length - jobs.length,
  };
}
