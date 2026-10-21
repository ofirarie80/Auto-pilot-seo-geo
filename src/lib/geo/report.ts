import "server-only";
import { supabaseAdmin } from "@/lib/supabase/admin";
import { hostOf } from "./analyze";
import type { EngineId } from "./engines";

export const ENGINE_LABEL: Record<EngineId, string> = {
  openai: "ChatGPT",
  anthropic: "Claude",
  gemini: "Gemini",
  perplexity: "Perplexity",
};
export const ENGINES = Object.keys(ENGINE_LABEL) as EngineId[];

type Row = {
  run_id: string;
  prompt_id: string;
  engine: EngineId;
  brand_mentioned: boolean;
  brand_cited: boolean;
  mention_position: number | null;
  competitors_mentioned: string[];
  cited_urls: string[];
  created_at: string;
};

export type Cell = "cited" | "mentioned" | "none" | "na";

export type SiteReport = {
  site: { id: string; name: string; domain: string };
  sites: { id: string; name: string; domain: string }[];
  hasData: boolean;
  runAt: string | null;
  answers: number;
  mentionRate: number;
  citationRate: number;
  avgPosition: number | null;
  delta: { mentionRate: number | null; citationRate: number | null };
  byEngine: { engine: EngineId; label: string; rate: number; answers: number }[];
  trend: { week: string; rate: number }[];
  prompts: { id: string; text: string; cells: Record<EngineId, Cell> }[];
  shareOfVoice: { name: string; rate: number; isSite: boolean }[];
  topCited: { domain: string; count: number }[];
};

const pct = (n: number, d: number) => (d ? Math.round((1000 * n) / d) / 10 : 0);

function summarize(rows: Row[]) {
  const n = rows.length;
  const mentioned = rows.filter((r) => r.brand_mentioned).length;
  const cited = rows.filter((r) => r.brand_cited).length;
  const positions = rows.map((r) => r.mention_position).filter((p): p is number => p != null);
  return {
    n,
    mentionRate: pct(mentioned, n),
    citationRate: pct(cited, n),
    avgPosition: positions.length ? Math.round((10 * positions.reduce((a, b) => a + b, 0)) / positions.length) / 10 : null,
  };
}

function weekKey(iso: string) {
  const d = new Date(iso);
  const day = d.getUTCDay(); // Sunday = 0 → weeks start Sunday, like the cron
  d.setUTCDate(d.getUTCDate() - day);
  return d.toISOString().slice(0, 10);
}

export async function getSiteReport(siteId?: string | null): Promise<SiteReport | null> {
  const db = supabaseAdmin();
  const { data: sites } = await db.from("sites").select("id, name, domain").eq("active", true).order("created_at");
  if (!sites?.length) return null;
  const site = sites.find((s) => s.id === siteId) ?? sites[0];

  const [{ data: runs }, { data: prompts }, { data: comps }] = await Promise.all([
    db.from("geo_runs").select("id, finished_at").eq("site_id", site.id).eq("status", "done")
      .order("started_at", { ascending: false }).limit(2),
    db.from("prompts").select("id, text").eq("site_id", site.id).eq("active", true).order("created_at"),
    db.from("competitors").select("name").eq("site_id", site.id),
  ]);

  const since = new Date(Date.now() - 8 * 7 * 864e5).toISOString();
  const { data: recent } = await db
    .from("geo_results")
    .select("run_id, prompt_id, engine, brand_mentioned, brand_cited, mention_position, competitors_mentioned, cited_urls, created_at")
    .eq("site_id", site.id)
    .is("error", null)
    .gte("created_at", since)
    .limit(5000);

  const rows = (recent ?? []) as Row[];
  const latestId = runs?.[0]?.id;
  const prevId = runs?.[1]?.id;
  const latest = rows.filter((r) => r.run_id === latestId);
  const prev = rows.filter((r) => r.run_id === prevId);
  const now = summarize(latest);
  const before = prev.length ? summarize(prev) : null;

  const byEngine = ENGINES.map((e) => {
    const r = latest.filter((x) => x.engine === e);
    return { engine: e, label: ENGINE_LABEL[e], rate: summarize(r).mentionRate, answers: r.length };
  }).filter((e) => e.answers > 0).sort((a, b) => b.rate - a.rate);

  const weeks = new Map<string, Row[]>();
  for (const r of rows) {
    const k = weekKey(r.created_at);
    weeks.set(k, [...(weeks.get(k) ?? []), r]);
  }
  const trend = [...weeks.entries()].sort(([a], [b]) => a.localeCompare(b))
    .map(([week, rs]) => ({ week, rate: summarize(rs).mentionRate }));

  const promptRows = (prompts ?? []).map((p) => {
    const cells = {} as Record<EngineId, Cell>;
    for (const e of ENGINES) {
      const r = latest.find((x) => x.prompt_id === p.id && x.engine === e);
      cells[e] = !r ? "na" : r.brand_cited ? "cited" : r.brand_mentioned ? "mentioned" : "none";
    }
    return { id: p.id, text: p.text, cells };
  });

  const compCount = new Map<string, number>((comps ?? []).map((c) => [c.name, 0]));
  for (const r of latest) for (const c of r.competitors_mentioned ?? []) compCount.set(c, (compCount.get(c) ?? 0) + 1);
  const shareOfVoice = [
    { name: site.name, rate: now.mentionRate, isSite: true },
    ...[...compCount.entries()].map(([name, n]) => ({ name, rate: pct(n, latest.length), isSite: false })),
  ].sort((a, b) => b.rate - a.rate);

  const domains = new Map<string, number>();
  for (const r of latest) {
    const seen = new Set((r.cited_urls ?? []).map(hostOf).filter((h): h is string => !!h));
    for (const h of seen) domains.set(h, (domains.get(h) ?? 0) + 1);
  }
  const topCited = [...domains.entries()].sort((a, b) => b[1] - a[1]).slice(0, 8)
    .map(([domain, count]) => ({ domain, count }));

  return {
    site,
    sites,
    hasData: latest.length > 0,
    runAt: runs?.[0]?.finished_at ?? null,
    answers: now.n,
    mentionRate: now.mentionRate,
    citationRate: now.citationRate,
    avgPosition: now.avgPosition,
    delta: {
      mentionRate: before ? Math.round(10 * (now.mentionRate - before.mentionRate)) / 10 : null,
      citationRate: before ? Math.round(10 * (now.citationRate - before.citationRate)) / 10 : null,
    },
    byEngine,
    trend,
    prompts: promptRows,
    shareOfVoice,
    topCited,
  };
}

/** Short Hebrew summary for WhatsApp. */
export function reportText(r: SiteReport): string {
  const d = (v: number | null) => (v == null ? "" : v >= 0 ? ` (▲${v})` : ` (▼${Math.abs(v)})`);
  const lines = [
    `📊 Lionet Pilot · ${r.site.name}`,
    `הוזכר ב-${r.mentionRate}% מהתשובות${d(r.delta.mentionRate)}`,
    `צוטט כמקור ב-${r.citationRate}%${d(r.delta.citationRate)}`,
  ];
  if (r.byEngine.length) lines.push(r.byEngine.map((e) => `${e.label} ${e.rate}%`).join(" · "));
  const leader = r.shareOfVoice.find((c) => !c.isSite);
  if (leader && leader.rate > r.mentionRate) lines.push(`מתחרה מוביל: ${leader.name} (${leader.rate}%)`);
  if (r.topCited[0]) lines.push(`האתר המצוטט ביותר: ${r.topCited[0].domain}`);
  return lines.join("\n");
}
