import Link from "next/link";
import { getOrgContext } from "@/lib/auth";
import { getSiteReport } from "@/lib/geo/report";
import { getGscReport } from "@/lib/google/report";
import AppHeader from "../AppHeader";

export const dynamic = "force-dynamic";
export const metadata = { title: "מבט על · Lionet Pilot" };

const PALETTE = ["#0E7C86", "#D9822B", "#6E56CF", "#C2416B", "#2F80ED", "#3D9A50", "#8A6D3B", "#5B6B79"];
const card = "rounded-[14px] border border-[#DCE2E8] bg-white p-5 dark:border-white/10 dark:bg-[#17212B]";
const nf = (n: number) => n.toLocaleString("he-IL");
const pctChange = (cur: number, prev: number) => (prev ? Math.round(((cur - prev) / prev) * 100) : null);

function Delta({ v, unit = "%", invert = false }: { v: number | null; unit?: string; invert?: boolean }) {
  if (v == null || v === 0) return null;
  const good = invert ? v < 0 : v > 0;
  return (
    <span className={`text-xs font-semibold tabular-nums ${good ? "text-[#1F7A45] dark:text-[#5FD08E]" : "text-[#B42318] dark:text-[#FF8A80]"}`}>
      {v > 0 ? "▲" : "▼"}{Math.abs(v)}{unit}
    </span>
  );
}

function Kpi({ label, value, sub, delta }: { label: string; value: string; sub?: string; delta?: React.ReactNode }) {
  return (
    <div className="flex min-w-0 flex-col gap-1 rounded-[12px] bg-white/[0.06] px-4 py-3.5">
      <span className="text-xs text-[#9FB3C3]">{label}</span>
      <span className="flex items-baseline gap-2">
        <span className="text-[28px] font-semibold leading-none tabular-nums text-white">{value}</span>
        {delta}
      </span>
      {sub && <span className="text-xs text-[#9FB3C3]">{sub}</span>}
    </div>
  );
}

type Series = { name: string; color: string; values: (number | null)[] };

/** Multi-line chart over shared x labels. Pure SVG, rendered on the server. */
function Lines({ labels, series, unit = "", height = 220, label }: { labels: string[]; series: Series[]; unit?: string; height?: number; label: string }) {
  const W = 680, H = height, L = 44, R = 12, T = 12, B = 26;
  const all = series.flatMap((s) => s.values.filter((v): v is number => v != null));
  const rawMax = Math.max(1, ...all);
  const step = Math.pow(10, Math.floor(Math.log10(rawMax)));
  const max = Math.ceil(rawMax / step) * step;
  const x = (i: number) => L + (labels.length <= 1 ? (W - L - R) / 2 : (i * (W - L - R)) / (labels.length - 1));
  const y = (v: number) => T + (H - T - B) * (1 - v / max);
  const ticks = [0, max / 2, max];
  const every = Math.max(1, Math.ceil(labels.length / 6));
  return (
    <svg viewBox={`0 0 ${W} ${H}`} role="img" aria-label={label} className="h-auto w-full" style={{ direction: "ltr" }}>
      {ticks.map((t) => (
        <g key={t}>
          <line x1={L} x2={W - R} y1={y(t)} y2={y(t)} stroke="currentColor" strokeOpacity={0.1} />
          <text x={L - 8} y={y(t) + 4} textAnchor="end" fontSize={11} fill="currentColor" fillOpacity={0.55}>{nf(Math.round(t))}{unit}</text>
        </g>
      ))}
      {labels.map((l, i) => (i % every === 0 || i === labels.length - 1) && (
        <text key={l} x={x(i)} y={H - 6} textAnchor="middle" fontSize={11} fill="currentColor" fillOpacity={0.55}>{l}</text>
      ))}
      {series.map((s) => {
        const pts = s.values.map((v, i) => (v == null ? null : [x(i), y(v)] as const)).filter((p): p is readonly [number, number] => !!p);
        return (
          <g key={s.name}>
            {pts.length > 1 && (
              <polyline points={pts.map((p) => p.join(",")).join(" ")} fill="none" stroke={s.color} strokeWidth={2.25} strokeLinejoin="round" strokeLinecap="round">
                <title>{s.name}</title>
              </polyline>
            )}
            {(pts.length <= 3 ? pts : pts.slice(-1)).map(([px, py], i) => (
              <circle key={i} cx={px} cy={py} r={4} fill={s.color} stroke="white" strokeWidth={1.5}><title>{s.name}</title></circle>
            ))}
          </g>
        );
      })}
    </svg>
  );
}

function Legend({ series }: { series: { name: string; color: string; note?: string }[] }) {
  return (
    <ul className="flex flex-wrap gap-x-4 gap-y-1.5 text-xs">
      {series.map((s) => (
        <li key={s.name} className="flex items-center gap-1.5">
          <span className="inline-block h-2.5 w-2.5 rounded-full" style={{ background: s.color }} />
          <span className="font-medium">{s.name}</span>
          {s.note && <span className="text-muted tabular-nums">{s.note}</span>}
        </li>
      ))}
    </ul>
  );
}

function Spark({ values, color }: { values: number[]; color: string }) {
  if (values.length < 2) return <div className="h-10" />;
  const W = 220, H = 40, max = Math.max(1, ...values);
  const pts = values.map((v, i) => `${(i * W) / (values.length - 1)},${H - 3 - (v / max) * (H - 6)}`);
  return (
    <svg viewBox={`0 0 ${W} ${H}`} className="h-10 w-full" preserveAspectRatio="none" style={{ direction: "ltr" }} aria-hidden>
      <polygon points={`0,${H} ${pts.join(" ")} ${W},${H}`} fill={color} fillOpacity={0.12} />
      <polyline points={pts.join(" ")} fill="none" stroke={color} strokeWidth={2} vectorEffect="non-scaling-stroke" />
    </svg>
  );
}

function Meter({ value, color }: { value: number; color: string }) {
  return (
    <div className="h-1.5 w-full overflow-hidden rounded-full bg-[#EEF1F4] dark:bg-white/10">
      <div className="h-full rounded-full" style={{ width: `${Math.max(2, Math.min(100, value))}%`, background: color }} />
    </div>
  );
}

const scoreColor = (n: number | null) => (n == null ? "#93A3B1" : n >= 85 ? "#1F7A45" : n >= 60 ? "#B26B00" : "#B42318");
const shortDate = (iso: string) => { const [, m, d] = iso.split("-"); return `${+d}.${+m}`; };

export default async function Manager({ searchParams }: { searchParams: Promise<{ org?: string }> }) {
  const { org } = await searchParams;
  const ctx = await getOrgContext(org);
  const { db } = ctx;
  const { data: sites } = await db.from("sites").select("id, name, domain, gsc_property, gsc_synced_at").eq("org_id", ctx.org.id).eq("active", true).order("created_at");
  const list = sites ?? [];

  const rows = await Promise.all(list.map(async (s, i) => {
    const [geo, gsc, { data: audit }, { data: items }] = await Promise.all([
      getSiteReport(db, s.id, ctx.org.id),
      s.gsc_property ? getGscReport(db, s.id, s.gsc_synced_at) : Promise.resolve(null),
      db.from("site_audits").select("score, checks, created_at").eq("site_id", s.id).order("created_at", { ascending: false }).limit(1).maybeSingle(),
      db.from("content_items").select("status, wp_status, title, published_at, scheduled_for").eq("site_id", s.id),
    ]);
    const it = items ?? [];
    const failing = ((audit?.checks ?? []) as { status: string; title: string }[]).filter((c) => c.status === "fail");
    return {
      site: s, color: PALETTE[i % PALETTE.length], geo: geo?.hasData ? geo : null, gsc,
      audit: audit?.score ?? null, failing,
      drafts: it.filter((x) => x.status === "draft").length,
      approved: it.filter((x) => x.status === "approved" && !x.wp_status).length,
      scheduled: it.filter((x) => x.wp_status === "future").length,
      published: it.filter((x) => x.wp_status === "publish").length,
    };
  }));

  // Portfolio totals
  const withGsc = rows.filter((r) => r.gsc);
  const clicks = withGsc.reduce((a, r) => a + r.gsc!.totals.clicks, 0);
  const prevClicks = withGsc.reduce((a, r) => a + r.gsc!.totals.prevClicks, 0);
  const impr = withGsc.reduce((a, r) => a + r.gsc!.totals.impressions, 0);
  const prevImpr = withGsc.reduce((a, r) => a + r.gsc!.totals.prevImpressions, 0);
  const withGeo = rows.filter((r) => r.geo);
  const answers = withGeo.reduce((a, r) => a + r.geo!.answers, 0);
  const mention = answers ? Math.round((10 * withGeo.reduce((a, r) => a + r.geo!.mentionRate * r.geo!.answers, 0)) / answers) / 10 : null;
  const audited = rows.filter((r) => r.audit != null);
  const avgAudit = audited.length ? Math.round(audited.reduce((a, r) => a + r.audit!, 0) / audited.length) : null;
  const published = rows.reduce((a, r) => a + r.published, 0);
  const inPipeline = rows.reduce((a, r) => a + r.drafts + r.approved + r.scheduled, 0);

  // Google clicks chart: shared last-28-days axis
  const dates = [...new Set(withGsc.flatMap((r) => r.gsc!.daily.map((d) => d.date)))].sort().slice(-28);
  const clickSeries: Series[] = withGsc.map((r) => {
    const m = new Map(r.gsc!.daily.map((d) => [d.date, d.clicks]));
    return { name: r.site.name, color: r.color, values: dates.map((d) => m.get(d) ?? 0) };
  });

  // AI mention chart: weekly
  const weeks = [...new Set(withGeo.flatMap((r) => r.geo!.trend.map((t) => t.week)))].sort();
  const aiSeries: Series[] = withGeo.map((r) => {
    const m = new Map(r.geo!.trend.map((t) => [t.week, t.rate]));
    return { name: r.site.name, color: r.color, values: weeks.map((w) => m.get(w) ?? null) };
  });

  // Highlights
  const growth = withGsc.map((r) => ({ r, d: r.gsc!.totals.clicks - r.gsc!.totals.prevClicks })).sort((a, b) => b.d - a.d);
  const topQuery = withGsc.flatMap((r) => r.gsc!.topQueries.slice(0, 1).map((q) => ({ site: r.site.name, ...q }))).sort((a, b) => b.clicks - a.clicks)[0];
  const losing = withGsc.flatMap((r) => r.gsc!.losingPages.map((p) => ({ site: r.site.name, siteId: r.site.id, ...p }))).sort((a, b) => a.delta - b.delta).slice(0, 4);
  const attention = rows.flatMap((r) => {
    const base = `org=${ctx.org.id}&site=${r.site.id}`;
    const out: { site: string; text: string; href: string }[] = [];
    if (r.drafts) out.push({ site: r.site.name, text: `${r.drafts} מאמרים ממתינים לאישור`, href: `/dashboard/content?${base}` });
    if (r.geo && r.geo.mentionRate < 20) out.push({ site: r.site.name, text: `ה-AI כמעט לא מזכיר את האתר (${r.geo.mentionRate}%)`, href: `/dashboard/content?${base}` });
    for (const f of r.failing.slice(0, 1)) out.push({ site: r.site.name, text: `תיקון טכני: ${f.title}`, href: `/dashboard?${base}` });
    if (!r.site.gsc_property && ctx.plan.gsc) out.push({ site: r.site.name, text: "Search Console לא מחובר", href: `/dashboard/settings?${base}` });
    return out;
  });

  return (
    <div className="min-h-screen">
      <AppHeader ctx={ctx} sites={list} base="/dashboard" />

      <section className="bg-[#13212E] px-4 pb-8 pt-6 text-white sm:px-8">
        <div className="mx-auto flex max-w-[1280px] flex-col gap-5">
          <div className="flex flex-wrap items-end justify-between gap-3">
            <div>
              <p className="text-xs font-medium tracking-wide text-[#4FC1C9]">מבט על</p>
              <h1 className="text-[30px] font-semibold leading-tight">{ctx.org.name}: {rows.length} אתרים בקידום</h1>
            </div>
            <p className="text-xs text-[#9FB3C3]">גוגל: 28 הימים האחרונים מול 28 הקודמים · AI: הבדיקה השבועית האחרונה</p>
          </div>
          <div className="grid grid-cols-2 gap-3 lg:grid-cols-5">
            <Kpi label="קליקים מגוגל" value={withGsc.length ? nf(clicks) : "—"} delta={<Delta v={pctChange(clicks, prevClicks)} />} sub={`${withGsc.length}/${rows.length} אתרים מחוברים`} />
            <Kpi label="הופעות בגוגל" value={withGsc.length ? nf(impr) : "—"} delta={<Delta v={pctChange(impr, prevImpr)} />} sub={impr ? `CTR ${Math.round((1000 * clicks) / impr) / 10}%` : undefined} />
            <Kpi label="אזכור במנועי AI" value={mention == null ? "—" : `${mention}%`} sub={answers ? `מתוך ${nf(answers)} תשובות` : "עוד לא רצה בדיקה"} />
            <Kpi label="ציון טכני ממוצע" value={avgAudit == null ? "—" : String(avgAudit)} sub="מוכנות לגוגל ול-AI" />
            <Kpi label="מאמרים" value={nf(published)} sub={`פורסמו · ${inPipeline} בתהליך`} />
          </div>
        </div>
      </section>

      <main className="mx-auto flex max-w-[1280px] flex-col gap-6 px-4 pb-12 pt-6 sm:px-8">
        <div className="grid gap-6 lg:grid-cols-[1.6fr_1fr]">
          <section className={`${card} flex flex-col gap-3`}>
            <div className="flex flex-wrap items-baseline justify-between gap-2">
              <h2 className="text-[17px] font-semibold">קליקים יומיים מגוגל</h2>
              <Legend series={withGsc.map((r) => ({ name: r.site.name, color: r.color, note: nf(r.gsc!.totals.clicks) }))} />
            </div>
            {dates.length ? <Lines labels={dates.map(shortDate)} series={clickSeries} label="קליקים יומיים לכל אתר" />
              : <p className="py-10 text-center text-sm text-muted">עוד אין נתונים מ-Search Console.</p>}
          </section>

          <section className={`${card} flex flex-col gap-3`}>
            <div className="flex flex-wrap items-baseline justify-between gap-2">
              <h2 className="text-[17px] font-semibold">אזכור ב-AI לפי שבוע</h2>
              <Legend series={withGeo.map((r) => ({ name: r.site.name, color: r.color, note: `${r.geo!.mentionRate}%` }))} />
            </div>
            {weeks.length ? <Lines labels={weeks.map(shortDate)} series={aiSeries} unit="%" label="אחוז אזכור בתשובות AI לפי שבוע" />
              : <p className="py-10 text-center text-sm text-muted">עוד לא רצה בדיקת AI.</p>}
            {weeks.length === 1 && <p className="text-xs text-muted">קו מגמה יופיע אחרי הבדיקה השבועית הבאה (יום ראשון 08:00).</p>}
          </section>
        </div>

        <section className="flex flex-col gap-3">
          <h2 className="text-[17px] font-semibold">האתרים</h2>
          <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
            {rows.map((r) => {
              const g = r.gsc;
              const base = `org=${ctx.org.id}&site=${r.site.id}`;
              return (
                <article key={r.site.id} className={`${card} flex flex-col gap-4`} style={{ borderTop: `4px solid ${r.color}` }}>
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0">
                      <Link href={`/dashboard?${base}`} className="text-lg font-semibold hover:underline">{r.site.name}</Link>
                      <span dir="ltr" className="block truncate text-xs text-muted">{r.site.domain}</span>
                    </div>
                    <span className="flex flex-col items-center">
                      <span className="text-[22px] font-semibold leading-none tabular-nums" style={{ color: scoreColor(r.audit) }}>{r.audit ?? "—"}</span>
                      <span className="text-[10px] text-muted">ציון טכני</span>
                    </span>
                  </div>

                  <div className="flex flex-col gap-1">
                    <div className="flex items-baseline justify-between">
                      <span className="text-xs text-muted">קליקים מגוגל (28 יום)</span>
                      <span className="flex items-baseline gap-1.5">
                        <span className="text-base font-semibold tabular-nums">{g ? nf(g.totals.clicks) : "—"}</span>
                        {g && <Delta v={pctChange(g.totals.clicks, g.totals.prevClicks)} />}
                      </span>
                    </div>
                    {g ? <Spark values={g.daily.map((d) => d.clicks)} color={r.color} /> : <p className="py-2 text-xs text-muted">Search Console לא מחובר</p>}
                    {g && <span className="text-xs text-muted tabular-nums">{nf(g.totals.impressions)} הופעות{g.totals.position ? ` · מיקום ממוצע ${g.totals.position}` : ""}</span>}
                  </div>

                  <div className="flex flex-col gap-1.5">
                    <div className="flex items-baseline justify-between text-xs">
                      <span className="text-muted">אזכור בתשובות AI</span>
                      <span className="flex items-baseline gap-1.5">
                        <span className="text-base font-semibold tabular-nums">{r.geo ? `${r.geo.mentionRate}%` : "—"}</span>
                        {r.geo && <Delta v={r.geo.delta.mentionRate} unit="" />}
                      </span>
                    </div>
                    <Meter value={r.geo?.mentionRate ?? 0} color={r.color} />
                    {r.geo && r.geo.byEngine.length > 0 && (
                      <span className="text-xs text-muted">{r.geo.byEngine.map((e) => `${e.label} ${e.rate}%`).join(" · ")}</span>
                    )}
                  </div>

                  <Link href={`/dashboard/content?${base}`} className="mt-auto grid grid-cols-4 gap-1 rounded-[10px] bg-[#F3F5F7] p-2 text-center dark:bg-white/5">
                    {[["לבדיקה", r.drafts], ["מאושרים", r.approved], ["מתוזמנים", r.scheduled], ["פורסמו", r.published]].map(([l, n]) => (
                      <span key={l as string} className="flex flex-col">
                        <span className="text-base font-semibold tabular-nums">{n}</span>
                        <span className="text-[10px] text-muted">{l}</span>
                      </span>
                    ))}
                  </Link>
                </article>
              );
            })}
          </div>
        </section>

        <div className="grid gap-6 lg:grid-cols-2">
          <section className={`${card} flex flex-col gap-3`}>
            <h2 className="text-[17px] font-semibold">מה בולט</h2>
            <ul className="flex flex-col gap-2.5 text-sm">
              {growth[0] && growth[0].d > 0 && (
                <li><span className="font-semibold">{growth[0].r.site.name}</span> בצמיחה: {nf(growth[0].d)}+ קליקים לעומת החודש הקודם.</li>
              )}
              {topQuery && (
                <li>השאילתה החזקה בתיק: <span dir="auto" className="font-semibold">&quot;{topQuery.key}&quot;</span> ({topQuery.site}, {nf(topQuery.clicks)} קליקים, מיקום {topQuery.position}).</li>
              )}
              {losing.map((p) => (
                <li key={p.site + p.key} className="text-[#B42318] dark:text-[#FF8A80]">
                  {p.site}: עמוד מאבד תנועה ({p.delta} קליקים) <span dir="ltr" className="block truncate text-xs text-muted">{p.key}</span>
                </li>
              ))}
              {!growth.length && !topQuery && <li className="text-muted">יופיע כשיהיו נתונים מגוגל.</li>}
            </ul>
          </section>

          <section className={`${card} flex flex-col gap-3`}>
            <h2 className="text-[17px] font-semibold">דורש טיפול</h2>
            {!attention.length ? <p className="text-sm text-muted">אין כרגע משהו דחוף.</p> : (
              <ul className="flex flex-col divide-y divide-[#EEF1F4] dark:divide-white/5">
                {attention.slice(0, 8).map((a, i) => (
                  <li key={i} className="flex flex-wrap items-center gap-x-3 gap-y-1 py-2">
                    <span className="rounded-md bg-[#EEF1F4] px-2 py-0.5 text-xs font-medium dark:bg-white/10">{a.site}</span>
                    <span className="min-w-0 flex-1 text-sm">{a.text}</span>
                    <Link href={a.href} className="text-sm font-medium text-accent hover:underline">לטיפול ←</Link>
                  </li>
                ))}
              </ul>
            )}
          </section>
        </div>
      </main>
    </div>
  );
}
