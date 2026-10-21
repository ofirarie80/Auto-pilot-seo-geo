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
};

/** One GEO run for one site: every active prompt × every configured engine. */
export async function runSite(siteId: string): Promise<RunSummary> {
  const db = supabaseAdmin();

  const { data: site, error: siteErr } = await db
    .from("sites")
    .select("id, name, domain, brand_terms")
    .eq("id", siteId)
    .single();
  if (siteErr || !site) throw new Error(`Site not found: ${siteId}`);

  const [{ data: prompts }, { data: comps }] = await Promise.all([
    db.from("prompts").select("id, text").eq("site_id", siteId).eq("active", true),
    db.from("competitors").select("name, domain, brand_terms").eq("site_id", siteId),
  ]);

  const engines = enabledEngines();
  if (!engines.length) throw new Error("No AI engine API keys configured");

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

  const jobs = (prompts ?? []).flatMap((p) => engines.map((e) => ({ p, e })));
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
  return { runId: run.id, site: site.name, engines, answers: ok, errors, mentionRate: pct(mentioned), citationRate: pct(cited) };
}
