import "server-only";
import type { SupabaseClient } from "@supabase/supabase-js";

type R = { kind: string; period: string; key: string; clicks: number; impressions: number; position: number };

export type GscReport = {
  syncedAt: string | null;
  totals: { clicks: number; impressions: number; position: number | null; prevClicks: number; prevImpressions: number };
  daily: { date: string; clicks: number }[];
  topQueries: { key: string; clicks: number; impressions: number; position: number; deltaClicks: number | null }[];
  losingPages: { key: string; clicks: number; prevClicks: number; delta: number }[];
};

/** Google data for one site, read through the caller's client (RLS applies). */
export async function getGscReport(db: SupabaseClient, siteId: string, syncedAt: string | null): Promise<GscReport | null> {
  const [{ data: daily }, { data: rows }] = await Promise.all([
    db.from("gsc_daily").select("date, clicks, impressions, position").eq("site_id", siteId).order("date"),
    db.from("gsc_rows").select("kind, period, key, clicks, impressions, position").eq("site_id", siteId).limit(2000),
  ]);
  if (!daily?.length) return null;

  const half = Math.max(0, daily.length - 28);
  const cur = daily.slice(half);
  const prev = daily.slice(0, half);
  const sum = (a: typeof daily, k: "clicks" | "impressions") => a.reduce((s, r) => s + Number(r[k]), 0);
  const imp = sum(cur, "impressions");
  const position = imp ? cur.reduce((s, r) => s + Number(r.position) * Number(r.impressions), 0) / imp : null;

  const rs = (rows ?? []) as R[];
  const pick = (kind: string, period: string) => new Map(rs.filter((r) => r.kind === kind && r.period === period).map((r) => [r.key, r]));
  const qPrev = pick("query", "previous");
  const pCur = pick("page", "current");
  const pPrev = pick("page", "previous");

  const topQueries = [...pick("query", "current").values()].sort((a, b) => b.clicks - a.clicks).slice(0, 15).map((r) => ({
    key: r.key, clicks: r.clicks, impressions: r.impressions, position: Math.round(r.position * 10) / 10,
    deltaClicks: qPrev.has(r.key) ? r.clicks - qPrev.get(r.key)!.clicks : null,
  }));

  const losingPages = [...pPrev.values()]
    .map((p) => ({ key: p.key, prevClicks: p.clicks, clicks: pCur.get(p.key)?.clicks ?? 0 }))
    .map((p) => ({ ...p, delta: p.clicks - p.prevClicks }))
    .filter((p) => p.delta <= -3)
    .sort((a, b) => a.delta - b.delta)
    .slice(0, 10);

  return {
    syncedAt,
    totals: {
      clicks: sum(cur, "clicks"), impressions: imp, position: position ? Math.round(position * 10) / 10 : null,
      prevClicks: sum(prev, "clicks"), prevImpressions: sum(prev, "impressions"),
    },
    daily: cur.map((d) => ({ date: d.date, clicks: Number(d.clicks) })),
    topQueries,
    losingPages,
  };
}
