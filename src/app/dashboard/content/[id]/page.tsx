import Link from "next/link";
import { notFound } from "next/navigation";
import { getOrgContext } from "@/lib/auth";
import { renderMarkdown } from "@/lib/content/render";
import AppHeader from "../../AppHeader";
import SubmitButton from "../SubmitButton";
import CopyButton from "../CopyButton";
import { STATUS_LABEL } from "../status";
import { rewriteArticle, saveArticle, setArticleStatus, deleteArticle, publishToWordPress } from "../actions";

export const dynamic = "force-dynamic";
export const maxDuration = 300;
export const metadata = { title: "תצוגה מקדימה · Lionet Pilot" };

const card = "rounded-[10px] border border-[#DCE2E8] bg-white p-5 dark:border-white/10 dark:bg-[#17212B]";
const input = "w-full rounded-md border border-[#C9D2DA] bg-white px-3 py-2 text-sm dark:border-white/15 dark:bg-[#0F161D]";

type Check = { label: string; ok: boolean; detail: string };

function seoChecks(i: { title: string; meta_description: string | null; body_md: string; word_count: number | null; faq: unknown[] }, brandTerms: string[]): Check[] {
  const t = i.title.length;
  const d = (i.meta_description ?? "").length;
  const h2 = (i.body_md.match(/^##\s/gm) ?? []).length;
  const words = i.word_count ?? 0;
  const todos = (i.body_md.match(/\[לבדיקה:[^\]]*\]/g) ?? []).length;
  const firstPara = i.body_md.split(/\n\s*\n/).find((p) => p.trim() && !p.startsWith("#")) ?? "";
  const brand = brandTerms.some((b) => b && i.body_md.toLowerCase().includes(b.toLowerCase()));
  return [
    { label: "אורך כותרת", ok: t >= 30 && t <= 65, detail: `${t} תווים (מומלץ 30–65)` },
    { label: "תיאור מטא", ok: d >= 110 && d <= 160, detail: `${d} תווים (מומלץ 110–160)` },
    { label: "אורך המאמר", ok: words >= 700, detail: `${words} מילים (מומלץ 700+)` },
    { label: "מבנה כותרות", ok: h2 >= 3, detail: `${h2} כותרות משנה` },
    { label: "תשובה ישירה בפתיחה", ok: firstPara.length > 80 && firstPara.length < 600, detail: firstPara ? `${firstPara.length} תווים בפסקה הראשונה` : "חסרה" },
    { label: "שאלות נפוצות + Schema", ok: i.faq.length >= 3, detail: `${i.faq.length} שאלות` },
    { label: "המותג מוזכר", ok: brand, detail: brand ? "כן" : "המאמר לא מזכיר את המותג" },
    { label: "נתונים להשלמה", ok: todos === 0, detail: todos ? `${todos} מקומות מסומנים [לבדיקה]` : "אין" },
  ];
}

export default async function ArticlePreview({
  params, searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ org?: string; msg?: string }>;
}) {
  const { id } = await params;
  const { org, msg } = await searchParams;
  const ctx = await getOrgContext(org);
  const { data: item } = await ctx.db.from("content_items").select("*").eq("id", id).maybeSingle();
  if (!item) notFound();
  const { data: site } = await ctx.db.from("sites").select("id, name, domain, brand_terms").eq("id", item.site_id).single();
  const { data: sites } = await ctx.db.from("sites").select("id, name").eq("org_id", ctx.org.id).order("created_at");
  const { data: wpConn } = await ctx.db.from("wp_connections").select("wp_url").eq("site_id", item.site_id).maybeSingle();
  const nowLocal = new Date(Date.now() + 26 * 3600_000).toLocaleString("sv-SE", { timeZone: "Asia/Jerusalem" }).slice(0, 16).replace(" ", "T");

  const faq = (item.faq ?? []) as { q: string; a: string }[];
  const bodyHtml = renderMarkdown(item.body_md);
  const checks = seoChecks(item, site?.brand_terms ?? []);
  const passed = checks.filter((c) => c.ok).length;
  const url = `${site?.domain ?? ""}/${item.slug ?? ""}`;
  const exportHtml = `<!-- ${item.title} -->\n${bodyHtml}\n<script type="application/ld+json">\n${item.schema_jsonld ?? ""}\n</script>`;
  const hidden = (
    <>
      <input type="hidden" name="id" value={item.id} />
      <input type="hidden" name="org_id" value={ctx.org.id} />
    </>
  );
  const st = STATUS_LABEL[item.status] ?? STATUS_LABEL.draft;

  return (
    <div className="min-h-screen">
      <AppHeader ctx={ctx} sites={sites ?? []} currentSite={site?.id} base="/dashboard/content" />
      <main className="mx-auto flex max-w-[1280px] flex-col gap-5 px-4 pb-12 pt-6 sm:px-8">
        <div className="flex flex-wrap items-center gap-3 text-sm">
          <Link href={`/dashboard/content?org=${ctx.org.id}&site=${item.site_id}`} className="text-accent hover:underline">← כל המאמרים</Link>
          <span className={`rounded-full px-2.5 py-0.5 text-xs font-semibold ${st.cls}`}>{st.label}</span>
          <span className="text-muted">יעד: {item.target_query}</span>
        </div>
        {msg && <p role="status" className="rounded-lg border border-[#DCE2E8] bg-white p-4 dark:bg-[#17212B]">{msg}</p>}

        <div className="flex flex-wrap items-start gap-5">
          {/* Preview as it would look on the site */}
          <article className={`${card} flex min-w-0 flex-[3_1_560px] flex-col gap-5 !p-6 sm:!p-10`}>
            <div className="flex flex-col gap-2 rounded-lg bg-[#F7F9FA] p-4 dark:bg-white/5" aria-label="תצוגה בתוצאות גוגל">
              <span className="text-xs text-muted">כך זה ייראה בגוגל</span>
              <span dir="ltr" className="text-right text-xs text-[#4E5F6E]">{url}</span>
              <span className="text-lg text-[#1A0DAB] dark:text-[#8AB4F8]">{item.title}</span>
              <span className="text-sm text-[#4D5156] dark:text-[#BDC1C6]">{item.meta_description}</span>
            </div>
            <h1 className="text-[clamp(26px,4vw,36px)] font-semibold leading-tight [text-wrap:balance]">{item.title}</h1>
            <div className="lp-article" dangerouslySetInnerHTML={{ __html: bodyHtml }} />
          </article>

          {/* Review panel */}
          <aside className="flex min-w-0 flex-[1_1_320px] flex-col gap-4">
            <section className={`${card} flex flex-col gap-3`}>
              <h2 className="font-semibold">החלטה</h2>
              <div className="flex flex-wrap gap-2">
                {item.status !== "approved" && (
                  <form action={setArticleStatus}>{hidden}<input type="hidden" name="status" value="approved" />
                    <SubmitButton>אישור</SubmitButton></form>
                )}
                {item.status !== "rejected" && (
                  <form action={setArticleStatus}>{hidden}<input type="hidden" name="status" value="rejected" />
                    <SubmitButton variant="ghost">דחייה</SubmitButton></form>
                )}
                {item.status !== "draft" && (
                  <form action={setArticleStatus}>{hidden}<input type="hidden" name="status" value="draft" />
                    <SubmitButton variant="ghost">החזרה לטיוטה</SubmitButton></form>
                )}
              </div>
              <p className="text-xs text-muted">שום דבר לא מתפרסם בלי אישור שלכם. אפשר גם להעתיק את ה-HTML ולהדביק ידנית.</p>
              <div className="flex flex-wrap gap-2">
                <CopyButton text={exportHtml} label="העתקת HTML" />
                <CopyButton text={item.body_md} label="העתקת Markdown" />
              </div>
            </section>

            <section className={`${card} flex flex-col gap-3`}>
              <h2 className="font-semibold">פרסום ב-WordPress</h2>
              {item.wp_post_id && (
                <p className="text-sm">
                  {item.wp_status === "future" && item.scheduled_for
                    ? `מתוזמן ל-${new Date(item.scheduled_for).toLocaleString("he-IL", { timeZone: "Asia/Jerusalem" })}`
                    : item.wp_status === "publish" ? "פורסם באתר" : "נמצא ב-WordPress כטיוטה"}
                  {item.wp_link && <> · <a href={item.wp_link} target="_blank" rel="noreferrer" className="text-accent underline">פתיחה</a></>}
                </p>
              )}
              {!wpConn ? (
                <p className="text-sm text-muted">
                  כדי לפרסם מכאן מחברים WordPress ב<Link href={`/dashboard/settings?org=${ctx.org.id}&site=${item.site_id}`} className="text-accent underline">הגדרות</Link>.
                </p>
              ) : item.status !== "approved" && item.status !== "published" ? (
                <p className="text-sm text-muted">מאשרים את המאמר, ואז אפשר לשלוח, לפרסם או לתזמן.</p>
              ) : (
                <div className="flex flex-col gap-3">
                  <div className="flex flex-wrap gap-2">
                    <form action={publishToWordPress}>{hidden}<input type="hidden" name="mode" value="draft" />
                      <SubmitButton variant="ghost" pendingText="שולח…">{item.wp_post_id ? "עדכון הטיוטה" : "שליחה כטיוטה"}</SubmitButton></form>
                    <form action={publishToWordPress}>{hidden}<input type="hidden" name="mode" value="publish" />
                      <SubmitButton pendingText="מפרסם…">פרסום עכשיו</SubmitButton></form>
                  </div>
                  <form action={publishToWordPress} className="flex flex-wrap items-end gap-2">
                    {hidden}<input type="hidden" name="mode" value="future" />
                    <label className="flex flex-col gap-1 text-sm">
                      תזמון (שעון ישראל)
                      <input type="datetime-local" name="when" required defaultValue={nowLocal} className={`${input} w-auto`} dir="ltr" />
                    </label>
                    <SubmitButton variant="ghost" pendingText="מתזמן…">תזמון</SubmitButton>
                  </form>
                </div>
              )}
            </section>

            <section className={`${card} flex flex-col gap-3`}>
              <h2 className="font-semibold">בדיקות SEO ו-GEO <span className="text-sm font-normal text-muted tabular-nums">({passed}/{checks.length})</span></h2>
              <ul className="flex flex-col gap-2 text-sm">
                {checks.map((c) => (
                  <li key={c.label} className="flex items-start justify-between gap-3">
                    <span>{c.label}<span className="block text-xs text-muted">{c.detail}</span></span>
                    <span className={`shrink-0 rounded-full px-2 py-0.5 text-xs font-semibold ${c.ok ? "bg-[#E1F3E8] text-[#1F7A45]" : "bg-[#FBEFD9] text-[#8A4B00]"}`}>
                      {c.ok ? "תקין" : "לשפר"}
                    </span>
                  </li>
                ))}
              </ul>
            </section>

            <section className={`${card} flex flex-col gap-3`}>
              <h2 className="font-semibold">שכתוב עם הערות</h2>
              <form action={rewriteArticle} className="flex flex-col gap-2">
                {hidden}
                <label htmlFor="feedback" className="sr-only">הערות לשכתוב</label>
                <textarea id="feedback" name="feedback" rows={4} defaultValue={item.feedback ?? ""} className={input}
                  placeholder="למשל: קצר יותר, להוסיף טבלת השוואה, טון פחות שיווקי, להדגיש את המאגר של 10,000 אתרים" />
                <SubmitButton variant="ghost" pendingText="משכתב… (עד דקה)">שכתוב המאמר</SubmitButton>
              </form>
            </section>

            <details className={card}>
              <summary className="cursor-pointer font-semibold">עריכה ידנית</summary>
              <form action={saveArticle} className="mt-3 flex flex-col gap-3 text-sm">
                {hidden}
                <label className="flex flex-col gap-1">כותרת<input name="title" defaultValue={item.title} className={input} /></label>
                <label className="flex flex-col gap-1">תיאור מטא<textarea name="meta_description" rows={3} defaultValue={item.meta_description ?? ""} className={input} /></label>
                <label className="flex flex-col gap-1">כתובת (slug)<input name="slug" dir="ltr" defaultValue={item.slug ?? ""} className={input} /></label>
                <label className="flex flex-col gap-1">גוף המאמר (Markdown)<textarea name="body_md" rows={16} defaultValue={item.body_md} className={`${input} font-mono text-xs leading-5`} /></label>
                <SubmitButton>שמירה</SubmitButton>
              </form>
            </details>

            <details className={card}>
              <summary className="cursor-pointer font-semibold">Schema (JSON-LD)</summary>
              <pre dir="ltr" className="mt-3 max-h-72 overflow-auto rounded bg-[#F7F9FA] p-3 text-left text-xs dark:bg-white/5">{item.schema_jsonld}</pre>
            </details>

            <form action={deleteArticle} className="self-start">
              {hidden}
              <SubmitButton variant="danger">מחיקת המאמר</SubmitButton>
            </form>
            <p className="text-xs text-muted">נכתב על ידי {item.model} · {new Date(item.created_at).toLocaleString("he-IL", { timeZone: "Asia/Jerusalem" })}</p>
          </aside>
        </div>
        {faq.length > 0 && <span className="sr-only">{faq.length} שאלות נפוצות</span>}
      </main>
    </div>
  );
}
