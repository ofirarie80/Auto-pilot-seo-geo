import Link from "next/link";
import { getOrgContext } from "@/lib/auth";
import { contentOpportunities } from "@/lib/content/opportunities";
import AppHeader from "../AppHeader";
import SubmitButton from "./SubmitButton";
import { STATUS_LABEL } from "./status";
import { createArticle } from "./actions";

export const dynamic = "force-dynamic";
export const maxDuration = 300;
export const metadata = { title: "תוכן · Lionet Pilot" };

const card = "rounded-[10px] border border-[#DCE2E8] bg-white p-5 dark:border-white/10 dark:bg-[#17212B]";
const input = "min-h-11 rounded-md border border-[#C9D2DA] bg-white px-3 text-sm dark:border-white/15 dark:bg-[#0F161D]";

export default async function ContentPage({
  searchParams,
}: {
  searchParams: Promise<{ site?: string; org?: string; msg?: string }>;
}) {
  const { site: siteParam, org, msg } = await searchParams;
  const ctx = await getOrgContext(org);
  const { data: sites } = await ctx.db.from("sites").select("id, name").eq("org_id", ctx.org.id).order("created_at");
  const site = sites?.find((s) => s.id === siteParam) ?? sites?.[0];

  const [opps, { data: items }, { data: usage }] = await Promise.all([
    site ? contentOpportunities(ctx.db, site.id) : Promise.resolve([]),
    site
      ? ctx.db.from("content_items").select("id, title, status, target_query, word_count, created_at").eq("site_id", site.id).order("created_at", { ascending: false })
      : Promise.resolve({ data: [] }),
    ctx.db.from("org_content_usage").select("articles_this_month").eq("org_id", ctx.org.id).maybeSingle(),
  ]);
  const used = Number(usage?.articles_this_month ?? 0);
  const limit = ctx.plan.monthly_articles ?? 0;
  const left = Math.max(0, limit - used);

  return (
    <div className="min-h-screen">
      <AppHeader ctx={ctx} sites={sites ?? []} currentSite={site?.id} base="/dashboard/content" />
      <main className="mx-auto flex max-w-[1100px] flex-col gap-6 px-4 pb-12 pt-7 sm:px-8">
        <div className="flex flex-wrap items-end justify-between gap-3">
          <div className="flex flex-col gap-1">
            <h1 className="text-[28px] font-semibold">תוכן{site ? ` · ${site.name}` : ""}</h1>
            <p className="text-sm text-muted">מאמרים שנכתבים סביב השאלות שה-AI לא מזכיר בהן אתכם. כל מאמר עובר אליכם לאישור לפני פרסום.</p>
          </div>
          <span className="text-sm text-muted tabular-nums">{used} / {limit} מאמרים החודש</span>
        </div>
        {msg && <p role="status" className="rounded-lg border border-[#DCE2E8] bg-white p-4 dark:bg-[#17212B]">{msg}</p>}

        {site && (
          <section className={`${card} flex flex-col gap-4`}>
            <div className="flex flex-col gap-1">
              <h2 className="text-[17px] font-semibold">הזדמנויות ({opps.length})</h2>
              <p className="text-sm text-muted">שאלות שבבדיקה האחרונה אף מנוע AI לא הזכיר בהן את {site.name}.</p>
            </div>
            {!opps.length ? (
              <p className="text-sm text-muted">אין כרגע הזדמנויות פתוחות. הן מופיעות אחרי בדיקת GEO, או כשכל השאלות כבר מכוסות.</p>
            ) : (
              <ul className="flex flex-col divide-y divide-[#EEF1F4] dark:divide-white/5">
                {opps.map((o) => (
                  <li key={o.promptId} className="flex flex-wrap items-center gap-x-4 gap-y-2 py-3">
                    <div className="flex min-w-0 flex-1 flex-col gap-0.5">
                      <span className="font-medium">{o.query}</span>
                      <span className="text-xs text-muted">
                        {o.competitors.length ? `מוזכרים במקומכם: ${o.competitors.join(", ")} · ` : ""}
                        {o.citedDomains.length ? `ה-AI מצטט: ${o.citedDomains.slice(0, 3).join(", ")}` : "ה-AI לא ציטט מקורות"}
                      </span>
                    </div>
                    <form action={createArticle}>
                      <input type="hidden" name="org_id" value={ctx.org.id} />
                      <input type="hidden" name="site_id" value={site.id} />
                      <input type="hidden" name="prompt_id" value={o.promptId} />
                      <SubmitButton disabled={!left} pendingText="כותב… (עד דקה)">כתיבת מאמר</SubmitButton>
                    </form>
                  </li>
                ))}
              </ul>
            )}
            <form action={createArticle} className="flex flex-wrap gap-2 border-t border-[#EEF1F4] pt-4 dark:border-white/5">
              <input type="hidden" name="org_id" value={ctx.org.id} />
              <input type="hidden" name="site_id" value={site.id} />
              <label htmlFor="q" className="sr-only">נושא חופשי</label>
              <input id="q" name="query" required minLength={5} placeholder="או נושא משלכם, למשל: איך בוחרים אתר לפוסט ממומן" className={`${input} min-w-0 flex-1`} />
              <SubmitButton disabled={!left} pendingText="כותב… (עד דקה)">כתיבת מאמר</SubmitButton>
            </form>
            {!left && <p className="text-sm text-[#8A4B00]">נגמרה מכסת המאמרים החודשית במסלול.</p>}
          </section>
        )}

        <section className={`${card} flex flex-col gap-3`}>
          <h2 className="text-[17px] font-semibold">מאמרים ({items?.length ?? 0})</h2>
          {!items?.length ? (
            <p className="text-sm text-muted">עוד אין מאמרים. בוחרים הזדמנות למעלה ולוחצים על כתיבת מאמר.</p>
          ) : (
            <ul className="flex flex-col divide-y divide-[#EEF1F4] dark:divide-white/5">
              {items.map((i) => (
                <li key={i.id} className="flex flex-wrap items-center gap-x-4 gap-y-1 py-3">
                  <Link href={`/dashboard/content/${i.id}?org=${ctx.org.id}`} className="min-w-0 flex-1 font-medium text-accent hover:underline">
                    {i.title}
                  </Link>
                  <span className="text-xs text-muted tabular-nums">{i.word_count ?? "—"} מילים · {new Date(i.created_at).toLocaleDateString("he-IL", { timeZone: "Asia/Jerusalem" })}</span>
                  <span className={`rounded-full px-2 py-0.5 text-xs font-semibold ${STATUS_LABEL[i.status]?.cls}`}>{STATUS_LABEL[i.status]?.label}</span>
                </li>
              ))}
            </ul>
          )}
        </section>
      </main>
    </div>
  );
}
