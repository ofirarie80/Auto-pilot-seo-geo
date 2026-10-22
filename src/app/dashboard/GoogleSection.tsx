import Link from "next/link";
import type { OrgContext } from "@/lib/auth";
import { getGscReport } from "@/lib/google/report";

const card = "rounded-[10px] border border-[#DCE2E8] bg-white p-5 dark:border-white/10 dark:bg-[#17212B]";
const fmt = (n: number) => n.toLocaleString("he-IL");

function Change({ cur, prev }: { cur: number; prev: number }) {
  if (!prev) return null;
  const pct = Math.round(((cur - prev) / prev) * 100);
  if (!pct) return <span className="text-[13px] text-muted">ללא שינוי</span>;
  return (
    <span className={`text-[13px] font-semibold ${pct > 0 ? "text-[#1F7A45]" : "text-[#B42318]"}`}>
      {pct > 0 ? "▲" : "▼"} {Math.abs(pct)}%
    </span>
  );
}

function Bars({ data }: { data: { date: string; clicks: number }[] }) {
  const max = Math.max(1, ...data.map((d) => d.clicks));
  const w = 600 / data.length;
  return (
    <svg viewBox="0 0 640 170" role="img" aria-label={`קליקים יומיים, מקסימום ${max}`} className="h-auto w-full" style={{ direction: "ltr" }}>
      <line x1="30" x2="630" y1="140" y2="140" stroke="#DCE2E8" />
      <text x="24" y="24" textAnchor="end" fontSize="11" fill="#5B6B79">{max}</text>
      <text x="24" y="143" textAnchor="end" fontSize="11" fill="#5B6B79">0</text>
      {data.map((d, i) => {
        const h = (d.clicks / max) * 120;
        return <rect key={d.date} x={30 + i * w + 1} y={140 - h} width={Math.max(1, w - 2)} height={h} rx="2" fill="#0E7C86" />;
      })}
      <text x="30" y="160" fontSize="10" fill="#5B6B79">{data[0]?.date.slice(5).split("-").reverse().join(".")}</text>
      <text x="630" y="160" textAnchor="end" fontSize="10" fill="#5B6B79">{data.at(-1)?.date.slice(5).split("-").reverse().join(".")}</text>
    </svg>
  );
}

export default async function GoogleSection({ ctx, siteId }: { ctx: OrgContext; siteId: string }) {
  const { data: site } = await ctx.db.from("sites").select("gsc_property, gsc_synced_at").eq("id", siteId).single();
  const settings = `/dashboard/settings?org=${ctx.org.id}&site=${siteId}`;

  if (!ctx.plan.gsc) {
    return (
      <section className={`${card} flex flex-col gap-2`}>
        <h2 className="text-[17px] font-semibold">ביצועים בגוגל</h2>
        <p className="text-sm text-muted">קליקים, חשיפות, מילות מפתח ועמודים שירדו מ-Search Console כלולים במסלולי Pro ומעלה.</p>
      </section>
    );
  }
  const r = site?.gsc_property ? await getGscReport(ctx.db, siteId, site.gsc_synced_at) : null;
  if (!r) {
    return (
      <section className={`${card} flex flex-col gap-2`}>
        <h2 className="text-[17px] font-semibold">ביצועים בגוגל</h2>
        <p className="text-sm text-muted">
          {site?.gsc_property ? "הנתונים מגוגל יופיעו אחרי הסנכרון הראשון." : "מחברים את Search Console כדי לראות קליקים, חשיפות ומילים מגוגל."}
        </p>
        <Link href={settings} className="self-start text-sm font-medium text-accent underline">להגדרות Google</Link>
      </section>
    );
  }

  const t = r.totals;
  return (
    <section className={`${card} flex flex-col gap-5`}>
      <div className="flex flex-wrap items-baseline justify-between gap-2">
        <h2 className="text-[17px] font-semibold">ביצועים בגוגל · 28 ימים אחרונים</h2>
        <span className="text-xs text-muted">מול 28 הימים שלפני · מקור: Search Console</span>
      </div>
      <div className="grid gap-4 [grid-template-columns:repeat(auto-fit,minmax(180px,1fr))]">
        <div className="flex flex-col gap-1"><span className="text-[13px] text-muted">קליקים</span>
          <span className="flex items-baseline gap-2"><b className="text-[28px] tabular-nums">{fmt(t.clicks)}</b><Change cur={t.clicks} prev={t.prevClicks} /></span></div>
        <div className="flex flex-col gap-1"><span className="text-[13px] text-muted">חשיפות</span>
          <span className="flex items-baseline gap-2"><b className="text-[28px] tabular-nums">{fmt(t.impressions)}</b><Change cur={t.impressions} prev={t.prevImpressions} /></span></div>
        <div className="flex flex-col gap-1"><span className="text-[13px] text-muted">מיקום ממוצע</span>
          <b className="text-[28px] tabular-nums">{t.position ?? "—"}</b></div>
      </div>
      <Bars data={r.daily} />
      <div className="flex flex-wrap gap-6">
        <div className="flex min-w-0 flex-[3_1_420px] flex-col gap-2">
          <h3 className="font-semibold">מילות חיפוש מובילות</h3>
          <div className="overflow-x-auto">
            <table className="w-full min-w-[420px] border-collapse text-sm">
              <thead>
                <tr className="text-right text-xs text-muted">
                  <th className="border-b border-[#DCE2E8] p-2 font-medium">מילה</th>
                  <th className="border-b border-[#DCE2E8] p-2 font-medium">קליקים</th>
                  <th className="border-b border-[#DCE2E8] p-2 font-medium">חשיפות</th>
                  <th className="border-b border-[#DCE2E8] p-2 font-medium">מיקום</th>
                </tr>
              </thead>
              <tbody>
                {r.topQueries.map((q) => (
                  <tr key={q.key}>
                    <td className="border-b border-[#EEF1F4] p-2 dark:border-white/5">{q.key}</td>
                    <td className="border-b border-[#EEF1F4] p-2 tabular-nums dark:border-white/5">
                      {fmt(q.clicks)}{" "}
                      {q.deltaClicks ? <span className={q.deltaClicks > 0 ? "text-[#1F7A45]" : "text-[#B42318]"}>({q.deltaClicks > 0 ? "+" : ""}{q.deltaClicks})</span> : null}
                    </td>
                    <td className="border-b border-[#EEF1F4] p-2 tabular-nums dark:border-white/5">{fmt(q.impressions)}</td>
                    <td className="border-b border-[#EEF1F4] p-2 tabular-nums dark:border-white/5">{q.position}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
        <div className="flex min-w-0 flex-[2_1_300px] flex-col gap-2">
          <h3 className="font-semibold">עמודים שאיבדו קליקים</h3>
          {!r.losingPages.length ? (
            <p className="text-sm text-muted">אין עמודים שירדו משמעותית.</p>
          ) : (
            <ul className="flex flex-col gap-1.5 text-sm">
              {r.losingPages.map((p) => (
                <li key={p.key} className="flex justify-between gap-2">
                  <a href={p.key} target="_blank" rel="noreferrer" dir="ltr" className="min-w-0 truncate text-accent">{p.key.replace(/^https?:\/\/(www\.)?/, "")}</a>
                  <span className="shrink-0 tabular-nums text-[#B42318]">{p.delta} ({p.prevClicks}→{p.clicks})</span>
                </li>
              ))}
            </ul>
          )}
        </div>
      </div>
    </section>
  );
}
