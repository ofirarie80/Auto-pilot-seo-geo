import Link from "next/link";
import { getOrgContext } from "@/lib/auth";
import { getSiteReport } from "@/lib/geo/report";
import { contentOpportunities } from "@/lib/content/opportunities";
import AppHeader from "../AppHeader";

export const dynamic = "force-dynamic";
export const metadata = { title: "סקירה · Lionet Pilot" };

const card = "rounded-[10px] border border-[#DCE2E8] bg-white p-5 dark:border-white/10 dark:bg-[#17212B]";
const pct = (cur: number, prev: number) => (prev ? Math.round(((cur - prev) / prev) * 100) : null);

function Delta({ v, unit = "" }: { v: number | null; unit?: string }) {
  if (v == null || v === 0) return null;
  return <span className={`text-xs font-semibold ${v > 0 ? "text-[#1F7A45]" : "text-[#B42318]"}`}>{v > 0 ? "▲" : "▼"}{Math.abs(v)}{unit}</span>;
}

function Score({ n }: { n: number | null }) {
  if (n == null) return <span className="text-muted">—</span>;
  const cls = n >= 85 ? "bg-[#E1F3E8] text-[#1F7A45]" : n >= 60 ? "bg-[#FBEFD9] text-[#8A4B00]" : "bg-[#FDE8E6] text-[#B42318]";
  return <span className={`rounded-full px-2 py-0.5 text-xs font-semibold tabular-nums ${cls}`}>{n}</span>;
}

export default async function Overview({ searchParams }: { searchParams: Promise<{ org?: string }> }) {
  const { org } = await searchParams;
  const ctx = await getOrgContext(org);
  const { db } = ctx;
  const { data: sites } = await db.from("sites").select("id, name, domain, gsc_property").eq("org_id", ctx.org.id).order("created_at");

  const rows = await Promise.all((sites ?? []).map(async (s) => {
    const [geo, { data: audit }, { data: daily }, { data: items }, opps] = await Promise.all([
      getSiteReport(db, s.id, ctx.org.id),
      db.from("site_audits").select("score, checks").eq("site_id", s.id).order("created_at", { ascending: false }).limit(1).maybeSingle(),
      db.from("gsc_daily").select("date, clicks").eq("site_id", s.id).order("date"),
      db.from("content_items").select("status, wp_status").eq("site_id", s.id),
      contentOpportunities(db, s.id),
    ]);
    const d = daily ?? [];
    const half = Math.max(0, d.length - 28);
    const clicks = d.slice(half).reduce((a, r) => a + r.clicks, 0);
    const prevClicks = d.slice(0, half).reduce((a, r) => a + r.clicks, 0);
    const it = items ?? [];
    const failing = ((audit?.checks ?? []) as { status: string; title: string }[]).filter((c) => c.status === "fail");
    return {
      site: s,
      mention: geo?.hasData ? geo.mentionRate : null,
      mentionDelta: geo?.delta.mentionRate ?? null,
      cited: geo?.hasData ? geo.citationRate : null,
      audit: audit?.score ?? null,
      failing,
      clicks: d.length ? clicks : null,
      clicksDelta: d.length ? pct(clicks, prevClicks) : null,
      drafts: it.filter((i) => i.status === "draft").length,
      approved: it.filter((i) => i.status === "approved").length,
      scheduled: it.filter((i) => i.wp_status === "future").length,
      published: it.filter((i) => i.wp_status === "publish").length,
      opps: opps.length,
    };
  }));

  // Next actions across all sites, most impactful first.
  const actions: { site: string; siteId: string; text: string; href: string }[] = [];
  for (const r of rows) {
    const base = `org=${ctx.org.id}&site=${r.site.id}`;
    if (r.drafts) actions.push({ site: r.site.name, siteId: r.site.id, text: `${r.drafts} מאמרים מחכים לאישור שלכם`, href: `/dashboard/content?${base}` });
    for (const f of r.failing.slice(0, 2)) actions.push({ site: r.site.name, siteId: r.site.id, text: `לתקן: ${f.title}`, href: `/dashboard?${base}` });
    if (r.opps && r.mention !== null && r.mention < 30) actions.push({ site: r.site.name, siteId: r.site.id, text: `${r.opps} שאלות שה-AI לא מזכיר אתכם בהן, אפשר לכתוב עליהן מאמר`, href: `/dashboard/content?${base}` });
    if (r.approved) actions.push({ site: r.site.name, siteId: r.site.id, text: `${r.approved} מאמרים מאושרים שעוד לא פורסמו`, href: `/dashboard/content?${base}` });
    if (r.mention === null) actions.push({ site: r.site.name, siteId: r.site.id, text: "עוד לא רצה בדיקת AI", href: `/dashboard?${base}` });
    if (ctx.plan.gsc && !r.site.gsc_property) actions.push({ site: r.site.name, siteId: r.site.id, text: "לחבר את Search Console", href: `/dashboard/settings?${base}` });
  }

  const th = "border-b border-[#DCE2E8] px-3 py-2 text-right text-xs font-medium text-muted";
  const td = "border-b border-[#EEF1F4] px-3 py-3 dark:border-white/5";

  return (
    <div className="min-h-screen">
      <AppHeader ctx={ctx} sites={sites ?? []} base="/dashboard" />
      <main className="mx-auto flex max-w-[1280px] flex-col gap-6 px-4 pb-12 pt-7 sm:px-8">
        <div className="flex flex-col gap-1">
          <h1 className="text-[28px] font-semibold">סקירה · {ctx.org.name}</h1>
          <p className="text-sm text-muted">כל האתרים במבט אחד: נראות ב-AI, גוגל, מצב טכני ותוכן.</p>
        </div>

        <section className={`${card} flex flex-col gap-3`}>
          <h2 className="text-[17px] font-semibold">מה לעשות עכשיו</h2>
          {!actions.length ? (
            <p className="text-sm text-muted">הכל מעודכן. הבדיקה הבאה ביום ראשון ב-08:00.</p>
          ) : (
            <ul className="flex flex-col divide-y divide-[#EEF1F4] dark:divide-white/5">
              {actions.slice(0, 10).map((a, i) => (
                <li key={i} className="flex flex-wrap items-center gap-x-3 gap-y-1 py-2.5">
                  <span className="rounded-md bg-[#EEF1F4] px-2 py-0.5 text-xs font-medium dark:bg-white/10">{a.site}</span>
                  <span className="min-w-0 flex-1 text-sm">{a.text}</span>
                  <Link href={a.href} className="text-sm font-medium text-accent hover:underline">לטיפול ←</Link>
                </li>
              ))}
            </ul>
          )}
        </section>

        <section className={`${card} flex flex-col gap-3`}>
          <h2 className="text-[17px] font-semibold">אתרים ({rows.length})</h2>
          <div className="overflow-x-auto">
            <table className="w-full min-w-[860px] border-collapse text-sm">
              <thead>
                <tr>
                  <th className={th}>אתר</th>
                  <th className={th}>אזכור ב-AI</th>
                  <th className={th}>ציטוט כמקור</th>
                  <th className={th}>קליקים בגוגל (28 יום)</th>
                  <th className={th}>ציון טכני</th>
                  <th className={th}>תוכן</th>
                </tr>
              </thead>
              <tbody>
                {rows.map((r) => (
                  <tr key={r.site.id}>
                    <td className={td}>
                      <Link href={`/dashboard?org=${ctx.org.id}&site=${r.site.id}`} className="font-semibold text-accent hover:underline">{r.site.name}</Link>
                      <span dir="ltr" className="block text-xs text-muted">{r.site.domain}</span>
                    </td>
                    <td className={`${td} tabular-nums`}>{r.mention == null ? "—" : <>{r.mention}% <Delta v={r.mentionDelta} /></>}</td>
                    <td className={`${td} tabular-nums`}>{r.cited == null ? "—" : `${r.cited}%`}</td>
                    <td className={`${td} tabular-nums`}>
                      {r.clicks == null ? <span className="text-xs text-muted">{ctx.plan.gsc ? "לא מחובר" : "במסלול Pro"}</span>
                        : <>{r.clicks.toLocaleString("he-IL")} <Delta v={r.clicksDelta} unit="%" /></>}
                    </td>
                    <td className={td}><Score n={r.audit} /></td>
                    <td className={`${td} text-xs`}>
                      <Link href={`/dashboard/content?org=${ctx.org.id}&site=${r.site.id}`} className="hover:underline">
                        {r.drafts} לבדיקה · {r.scheduled} מתוזמנים · {r.published} פורסמו
                        {r.opps ? <span className="block text-muted">{r.opps} הזדמנויות</span> : null}
                      </Link>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>
      </main>
    </div>
  );
}
