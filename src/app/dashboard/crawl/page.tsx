import { getOrgContext } from "@/lib/auth";
import { ISSUES, type CrawlSummary } from "@/lib/crawl/crawl";
import AppHeader from "../AppHeader";
import SubmitButton from "../content/SubmitButton";
import AutoRefresh from "./AutoRefresh";
import { startCrawlAction } from "./actions";

export const dynamic = "force-dynamic";
export const metadata = { title: "סריקת אתר · Lionet Pilot" };

const card = "rounded-[12px] border border-[#DCE2E8] bg-white p-5 dark:border-white/10 dark:bg-[#17212B]";
const nf = (n: number) => n.toLocaleString("he-IL");
const when = (iso: string) => new Date(iso).toLocaleString("he-IL", { timeZone: "Asia/Jerusalem", dateStyle: "short", timeStyle: "short" });
const path = (u: string) => { try { const x = new URL(u); return decodeURI(x.pathname) || "/"; } catch { return u; } };

type PageRow = { url: string; status_code: number | null; title: string | null; word_count: number | null; load_ms: number | null; issues: string[] };

export default async function Crawl({ searchParams }: { searchParams: Promise<{ org?: string; site?: string; msg?: string }> }) {
  const { org, site: siteParam, msg } = await searchParams;
  const ctx = await getOrgContext(org);
  const { db } = ctx;
  const { data: sites } = await db.from("sites").select("id, name, domain").eq("org_id", ctx.org.id).eq("active", true).order("created_at");
  const site = (sites ?? []).find((s) => s.id === siteParam) ?? sites?.[0];
  if (!site) return null;

  const { data: crawl } = await db.from("site_crawls").select("id, status, page_limit, pages_found, pages_done, summary, started_at, finished_at")
    .eq("site_id", site.id).order("started_at", { ascending: false }).limit(1).maybeSingle();
  const { data: prevDone } = await db.from("site_crawls").select("summary, finished_at").eq("site_id", site.id).eq("status", "done")
    .order("started_at", { ascending: false }).range(crawl?.status === "done" ? 1 : 0, crawl?.status === "done" ? 1 : 0).maybeSingle();

  const pages: PageRow[] = [];
  if (crawl?.status === "done") {
    for (let from = 0; from < 6000; from += 1000) {
      const { data } = await db.from("crawl_pages").select("url, status_code, title, word_count, load_ms, issues").eq("crawl_id", crawl.id).range(from, from + 999);
      pages.push(...((data ?? []) as PageRow[]));
      if (!data || data.length < 1000) break;
    }
  }
  const sum = crawl?.status === "done" ? (crawl.summary as CrawlSummary) : null;
  const prev = prevDone?.summary as CrawlSummary | undefined;
  const groups = Object.entries(sum?.issues ?? {})
    .filter(([k]) => ISSUES[k])
    .sort(([a, x], [b, y]) => (ISSUES[a].severity === ISSUES[b].severity ? y - x : ISSUES[a].severity === "fail" ? -1 : 1));
  const worst = [...pages].sort((a, b) => b.issues.length - a.issues.length).slice(0, 100);
  const scoreColor = (n: number) => (n >= 85 ? "#1F7A45" : n >= 60 ? "#B26B00" : "#B42318");

  return (
    <div className="min-h-screen">
      <AppHeader ctx={ctx} sites={sites ?? []} currentSite={site.id} base="/dashboard/crawl" />
      {crawl?.status === "running" && <AutoRefresh siteId={site.id} crawlId={crawl.id} />}
      <main className="mx-auto flex max-w-[1280px] flex-col gap-6 px-4 pb-12 pt-7 sm:px-8">
        <div className="flex flex-wrap items-end justify-between gap-3">
          <div className="flex flex-col gap-1">
            <h1 className="text-[28px] font-semibold">סריקת אתר · {site.name}</h1>
            <p className="text-sm text-muted">
              בודקים כל עמוד באתר: שגיאות, כותרות, תיאורים, H1, תוכן דל, Schema, תמונות, מהירות וקישורים שבורים.
              {" "}עד {nf(ctx.plan.crawl_pages ?? 0)} עמודים במסלול.
            </p>
          </div>
          <form action={startCrawlAction}>
            <input type="hidden" name="site_id" value={site.id} />
            <input type="hidden" name="org_id" value={ctx.org.id} />
            <SubmitButton pendingText="מאתר עמודים…" disabled={crawl?.status === "running"}>
              {crawl ? "סריקה חדשה" : "סריקת כל האתר"}
            </SubmitButton>
          </form>
        </div>

        {msg && <p role="status" className="rounded-md border border-[#C9D2DA] bg-white px-4 py-3 text-sm dark:bg-white/5">{msg}</p>}

        {!crawl && (
          <section className={`${card} py-12 text-center`}>
            <p className="text-lg font-semibold">עוד לא נסרק</p>
            <p className="mt-1 text-sm text-muted">לחצו &quot;סריקת כל האתר&quot;. הסריקה עוברת על כל העמודים שב-sitemap ולוקחת כמה דקות.</p>
          </section>
        )}

        {crawl?.status === "running" && (
          <section className={`${card} flex flex-col gap-3`}>
            <div className="flex items-baseline justify-between">
              <h2 className="text-[17px] font-semibold">סורקים…</h2>
              <span className="text-sm tabular-nums">{nf(crawl.pages_done)} / {nf(crawl.pages_found)} עמודים</span>
            </div>
            <div className="h-2.5 overflow-hidden rounded-full bg-[#EEF1F4] dark:bg-white/10">
              <div className="h-full rounded-full bg-accent transition-all" style={{ width: `${crawl.pages_found ? Math.max(3, (100 * crawl.pages_done) / crawl.pages_found) : 3}%` }} />
            </div>
            <p className="text-xs text-muted">אפשר לסגור את הדף. הסריקה ממשיכה ברקע.</p>
          </section>
        )}

        {crawl?.status === "error" && <p className="text-sm text-[#B42318]">הסריקה נכשלה. נסו שוב.</p>}

        {sum && (
          <>
            <section className="grid grid-cols-2 gap-3 lg:grid-cols-4">
              <div className={card}>
                <span className="text-xs text-muted">ציון האתר</span>
                <p className="flex items-baseline gap-2">
                  <span className="text-[32px] font-semibold tabular-nums" style={{ color: scoreColor(sum.score) }}>{sum.score}</span>
                  {prev && prev.score !== sum.score && <span className={`text-xs font-semibold ${sum.score > prev.score ? "text-[#1F7A45]" : "text-[#B42318]"}`}>{sum.score > prev.score ? "▲" : "▼"}{Math.abs(sum.score - prev.score)}</span>}
                </p>
              </div>
              <div className={card}><span className="text-xs text-muted">עמודים שנסרקו</span><p className="text-[32px] font-semibold tabular-nums">{nf(sum.pages)}</p>
                <span className="text-xs text-muted">{sum.mode === "sitemap" ? "מתוך ה-sitemap" : "לפי קישורים באתר"}{crawl!.pages_found >= crawl!.page_limit ? " · הגעתם למגבלת המסלול" : ""}</span></div>
              <div className={card}><span className="text-xs text-muted">עמודים בלי בעיות קריטיות</span><p className="text-[32px] font-semibold tabular-nums">{sum.pages ? Math.round((100 * sum.healthy) / sum.pages) : 0}%</p>
                <span className="text-xs text-muted">{nf(sum.healthy)} עמודים</span></div>
              <div className={card}><span className="text-xs text-muted">זמן טעינה ממוצע</span><p className="text-[32px] font-semibold tabular-nums">{sum.avgLoadMs ? `${(sum.avgLoadMs / 1000).toFixed(1)}s` : "—"}</p>
                <span className="text-xs text-muted">נסרק {when(crawl!.finished_at ?? crawl!.started_at)}</span></div>
            </section>

            <section className={`${card} flex flex-col gap-2`}>
              <h2 className="text-[17px] font-semibold">בעיות לפי סוג</h2>
              {!groups.length && <p className="text-sm text-muted">לא נמצאו בעיות. מצוין.</p>}
              {groups.map(([k, n]) => {
                const meta = ISSUES[k];
                const urls = pages.filter((p) => p.issues.includes(k));
                return (
                  <details key={k} className="group rounded-[10px] border border-[#EEF1F4] dark:border-white/10">
                    <summary className="flex cursor-pointer list-none flex-wrap items-center gap-3 px-4 py-3">
                      <span className={`h-2.5 w-2.5 rounded-full ${meta.severity === "fail" ? "bg-[#B42318]" : "bg-[#D9822B]"}`} />
                      <span className="min-w-0 flex-1 text-sm font-medium">{meta.label}</span>
                      <span className="rounded-full bg-[#EEF1F4] px-2.5 py-0.5 text-xs font-semibold tabular-nums dark:bg-white/10">{nf(n)} עמודים</span>
                      <span className="text-xs text-muted group-open:hidden">הצגה</span>
                    </summary>
                    <div className="flex flex-col gap-2 border-t border-[#EEF1F4] px-4 py-3 dark:border-white/10">
                      <p className="text-sm"><span className="font-semibold">איך מתקנים: </span>{meta.fix}</p>
                      <ul className="flex flex-col gap-1 text-xs">
                        {urls.slice(0, 60).map((p) => (
                          <li key={p.url} className="truncate">
                            <a href={p.url} target="_blank" rel="noreferrer" dir="ltr" className="text-accent hover:underline">{path(p.url)}</a>
                            {p.title && <span className="text-muted"> · {p.title}</span>}
                          </li>
                        ))}
                        {urls.length > 60 && <li className="text-muted">ועוד {nf(urls.length - 60)}…</li>}
                      </ul>
                    </div>
                  </details>
                );
              })}
            </section>

            <section className={`${card} flex flex-col gap-3`}>
              <h2 className="text-[17px] font-semibold">העמודים עם הכי הרבה בעיות</h2>
              <div className="overflow-x-auto">
                <table className="w-full min-w-[760px] border-collapse text-sm">
                  <thead>
                    <tr className="text-right text-xs text-muted">
                      {["עמוד", "סטטוס", "מילים", "טעינה", "בעיות"].map((h) => <th key={h} className="border-b border-[#DCE2E8] px-3 py-2 font-medium">{h}</th>)}
                    </tr>
                  </thead>
                  <tbody>
                    {worst.map((p) => (
                      <tr key={p.url} className="align-top">
                        <td className="max-w-[320px] border-b border-[#EEF1F4] px-3 py-2.5 dark:border-white/5">
                          <a href={p.url} target="_blank" rel="noreferrer" dir="ltr" className="block truncate text-accent hover:underline">{path(p.url)}</a>
                          {p.title && <span className="block truncate text-xs text-muted">{p.title}</span>}
                        </td>
                        <td className={`border-b border-[#EEF1F4] px-3 py-2.5 tabular-nums dark:border-white/5 ${(p.status_code ?? 0) >= 400 || !p.status_code ? "font-semibold text-[#B42318]" : ""}`}>{p.status_code || "—"}</td>
                        <td className="border-b border-[#EEF1F4] px-3 py-2.5 tabular-nums dark:border-white/5">{p.word_count ?? "—"}</td>
                        <td className="border-b border-[#EEF1F4] px-3 py-2.5 tabular-nums dark:border-white/5">{p.load_ms ? `${(p.load_ms / 1000).toFixed(1)}s` : "—"}</td>
                        <td className="border-b border-[#EEF1F4] px-3 py-2.5 dark:border-white/5">
                          <span className="flex flex-wrap gap-1">
                            {p.issues.length ? p.issues.filter((i) => ISSUES[i]).map((i) => (
                              <span key={i} className={`rounded px-1.5 py-0.5 text-[11px] ${ISSUES[i].severity === "fail" ? "bg-[#FDE8E6] text-[#B42318]" : "bg-[#FBEFD9] text-[#8A4B00]"}`}>{ISSUES[i].label}{(i === "title_long" || i === "title_short") && p.title ? ` (${p.title.length} תווים, מומלץ 30–60)` : ""}</span>
                            )) : <span className="text-xs text-[#1F7A45]">תקין</span>}
                          </span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </section>
          </>
        )}
      </main>
    </div>
  );
}
