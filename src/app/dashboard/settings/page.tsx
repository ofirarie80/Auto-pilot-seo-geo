import Link from "next/link";
import { supabaseAdmin } from "@/lib/supabase/admin";
import { addPrompt, togglePrompt, deletePrompt, addCompetitor, deleteCompetitor, updateBrandTerms } from "./actions";

export const dynamic = "force-dynamic";
export const metadata = { title: "הגדרות · Lionet Pilot" };

const card = "rounded-[10px] border border-[#DCE2E8] bg-white p-5 dark:border-white/10 dark:bg-[#17212B]";
const input = "min-h-11 rounded-md border border-[#C9D2DA] bg-white px-3 text-sm dark:border-white/15 dark:bg-[#0F161D]";
const btn = "min-h-11 rounded-md bg-accent px-4 text-sm font-semibold text-white";
const ghost = "min-h-9 rounded-md px-2.5 text-xs font-medium text-muted hover:bg-black/5 dark:hover:bg-white/5";

export default async function Settings({ searchParams }: { searchParams: Promise<{ site?: string }> }) {
  const { site: siteParam } = await searchParams;
  const db = supabaseAdmin();
  const { data: sites } = await db.from("sites").select("id, name, domain, brand_terms").eq("active", true).order("created_at");
  const site = sites?.find((s) => s.id === siteParam) ?? sites?.[0];
  if (!site) return <main className="mx-auto max-w-2xl px-4 py-16">אין עדיין אתרים במערכת.</main>;

  const [{ data: prompts }, { data: comps }] = await Promise.all([
    db.from("prompts").select("id, text, topic, active").eq("site_id", site.id).order("created_at"),
    db.from("competitors").select("id, name, domain, brand_terms").eq("site_id", site.id).order("created_at"),
  ]);

  return (
    <div className="min-h-screen">
      <header className="flex flex-wrap items-center gap-x-7 gap-y-3 bg-[#13212E] px-4 py-3.5 text-white sm:px-8">
        <Link href={`/dashboard?site=${site.id}`} className="text-xl font-semibold text-white">Lionet Pilot</Link>
        <nav aria-label="אתרים" className="flex flex-wrap gap-1">
          {sites!.map((s) => (
            <Link key={s.id} href={`/dashboard/settings?site=${s.id}`}
              className={`rounded-md px-3.5 py-2.5 text-sm ${s.id === site.id ? "bg-[#22384A] font-medium text-white" : "text-[#C7D3DD] hover:text-white"}`}>
              {s.name}
            </Link>
          ))}
        </nav>
        <Link href={`/dashboard?site=${site.id}`} className="ms-auto text-sm text-[#C7D3DD] hover:text-white">← חזרה לדשבורד</Link>
      </header>

      <main className="mx-auto flex max-w-[960px] flex-col gap-6 px-4 pb-12 pt-7 sm:px-8">
        <h1 className="text-[28px] font-semibold">הגדרות · {site.name}</h1>

        <section className={`${card} flex flex-col gap-3`}>
          <h2 className="text-[17px] font-semibold">שמות שהמותג מופיע בהם</h2>
          <p className="text-sm text-muted">כל שם כאן שמופיע בתשובה של ה-AI נספר כאזכור. מפרידים בפסיק.</p>
          <form action={updateBrandTerms} className="flex flex-wrap gap-2">
            <input type="hidden" name="id" value={site.id} />
            <label htmlFor="brand-terms" className="sr-only">שמות המותג</label>
            <input id="brand-terms" name="terms" defaultValue={(site.brand_terms ?? []).join(", ")} className={`${input} min-w-0 flex-1`} />
            <button className={btn}>שמירה</button>
          </form>
        </section>

        <section className={`${card} flex flex-col gap-4`}>
          <h2 className="text-[17px] font-semibold">מתחרים ({comps?.length ?? 0})</h2>
          {!comps?.length && <p className="text-sm text-muted">עוד אין מתחרים. בלי מתחרים אין השוואת "נתח קול".</p>}
          <ul className="flex flex-col divide-y divide-[#EEF1F4] dark:divide-white/5">
            {comps?.map((c) => (
              <li key={c.id} className="flex flex-wrap items-center gap-x-3 gap-y-1 py-2.5">
                <span className="font-medium">{c.name}</span>
                {c.domain && <span dir="ltr" className="text-sm text-muted">{c.domain}</span>}
                {!!c.brand_terms?.length && <span className="text-xs text-muted">גם: {c.brand_terms.join(", ")}</span>}
                <form action={deleteCompetitor} className="ms-auto">
                  <input type="hidden" name="id" value={c.id} />
                  <button className={ghost} aria-label={`מחיקת ${c.name}`}>מחיקה</button>
                </form>
              </li>
            ))}
          </ul>
          <form action={addCompetitor} className="grid gap-2 sm:grid-cols-[1fr_1fr_1fr_auto]">
            <input type="hidden" name="site_id" value={site.id} />
            <label className="sr-only" htmlFor="c-name">שם המתחרה</label>
            <input id="c-name" name="name" required placeholder="שם המתחרה" className={input} />
            <label className="sr-only" htmlFor="c-domain">דומיין</label>
            <input id="c-domain" name="domain" dir="ltr" placeholder="example.co.il" className={input} />
            <label className="sr-only" htmlFor="c-terms">שמות נוספים</label>
            <input id="c-terms" name="terms" placeholder="שמות נוספים, בפסיקים" className={input} />
            <button className={btn}>הוספה</button>
          </form>
        </section>

        <section className={`${card} flex flex-col gap-4`}>
          <h2 className="text-[17px] font-semibold">שאלות שנבדקות ({prompts?.filter((p) => p.active).length ?? 0} פעילות)</h2>
          <p className="text-sm text-muted">כל שאלה נשלחת כל שבוע ל-4 מנועי AI. כדאי לנסח כמו שלקוח אמיתי היה שואל.</p>
          <ul className="flex flex-col divide-y divide-[#EEF1F4] dark:divide-white/5">
            {prompts?.map((p) => (
              <li key={p.id} className={`flex flex-wrap items-center gap-x-3 gap-y-1 py-2.5 ${p.active ? "" : "opacity-50"}`}>
                <span className="min-w-0 flex-1">{p.text}</span>
                {p.topic && <span className="rounded-full bg-[#EEF1F4] px-2 py-0.5 text-xs text-muted dark:bg-white/10">{p.topic}</span>}
                <form action={togglePrompt}>
                  <input type="hidden" name="id" value={p.id} />
                  <input type="hidden" name="active" value={String(p.active)} />
                  <button className={ghost}>{p.active ? "השהיה" : "הפעלה"}</button>
                </form>
                <form action={deletePrompt}>
                  <input type="hidden" name="id" value={p.id} />
                  <button className={ghost}>מחיקה</button>
                </form>
              </li>
            ))}
          </ul>
          <form action={addPrompt} className="grid gap-2 sm:grid-cols-[3fr_1fr_auto]">
            <input type="hidden" name="site_id" value={site.id} />
            <label className="sr-only" htmlFor="p-text">שאלה חדשה</label>
            <input id="p-text" name="text" required minLength={5} placeholder="למשל: איפה הכי כדאי לקנות קישורים בישראל?" className={input} />
            <label className="sr-only" htmlFor="p-topic">נושא</label>
            <input id="p-topic" name="topic" placeholder="נושא (לא חובה)" className={input} />
            <button className={btn}>הוספה</button>
          </form>
        </section>
      </main>
    </div>
  );
}
