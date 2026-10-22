import { getOrgContext } from "@/lib/auth";
import AppHeader from "../AppHeader";
import {
  addSite, addPrompt, togglePrompt, deletePrompt, addCompetitor, deleteCompetitor, updateBrandTerms, updateNotifications,
  setGscProperty, syncGscNow, disconnectGoogle, connectWordPress, disconnectWordPress,
} from "./actions";

export const dynamic = "force-dynamic";
export const metadata = { title: "הגדרות · Lionet Pilot" };

const card = "rounded-[10px] border border-[#DCE2E8] bg-white p-5 dark:border-white/10 dark:bg-[#17212B]";
const input = "min-h-11 rounded-md border border-[#C9D2DA] bg-white px-3 text-sm dark:border-white/15 dark:bg-[#0F161D]";
const btn = "min-h-11 rounded-md bg-accent px-4 text-sm font-semibold text-white";
const ghost = "min-h-9 rounded-md px-2.5 text-xs font-medium text-muted hover:bg-black/5 dark:hover:bg-white/5";

export default async function Settings({
  searchParams,
}: {
  searchParams: Promise<{ site?: string; org?: string; msg?: string }>;
}) {
  const { site: siteParam, org, msg } = await searchParams;
  const ctx = await getOrgContext(org);
  const { db, plan } = ctx;

  const { data: sites } = await db
    .from("sites").select("id, name, domain, brand_terms, gsc_property, gsc_synced_at").eq("org_id", ctx.org.id).order("created_at");
  const { data: google } = await db
    .from("google_connections").select("google_email, properties, updated_at").eq("org_id", ctx.org.id).maybeSingle();
  const planHasGsc = plan.gsc === true;
  const site = sites?.find((s) => s.id === siteParam) ?? sites?.[0];
  const { data: wpConn } = site
    ? await db.from("wp_connections").select("wp_url, username, wp_user_name, updated_at").eq("site_id", site.id).maybeSingle()
    : { data: null };

  const [{ data: prompts }, { data: comps }] = site
    ? await Promise.all([
        db.from("prompts").select("id, text, topic, active").eq("site_id", site.id).order("created_at"),
        db.from("competitors").select("id, name, domain, brand_terms").eq("site_id", site.id).order("created_at"),
      ])
    : [{ data: [] }, { data: [] }];

  const activePrompts = prompts?.filter((p) => p.active).length ?? 0;
  const hidden = (
    <>
      <input type="hidden" name="org_id" value={ctx.org.id} />
      {site && <input type="hidden" name="site_id" value={site.id} />}
    </>
  );
  const isOwner = ctx.org.role === "owner" || ctx.org.role === "admin";

  return (
    <div className="min-h-screen">
      <AppHeader ctx={ctx} sites={sites ?? []} currentSite={site?.id} base="/dashboard/settings" />

      <main className="mx-auto flex max-w-[960px] flex-col gap-6 px-4 pb-12 pt-7 sm:px-8">
        <h1 className="text-[28px] font-semibold">הגדרות{site ? ` · ${site.name}` : ""}</h1>
        {msg && <p role="status" className="rounded-lg border border-[#DCE2E8] bg-white p-4 dark:bg-[#17212B]">{msg}</p>}

        <section className={`${card} flex flex-col gap-3`}>
          <h2 className="text-[17px] font-semibold">המסלול שלכם: {plan.name}</h2>
          <ul className="grid gap-2 text-sm sm:grid-cols-2">
            <li>אתרים: <b className="tabular-nums">{sites?.length ?? 0} / {plan.max_sites}</b></li>
            <li>שאלות לאתר: <b className="tabular-nums">{plan.max_prompts_per_site}</b></li>
            <li>תשובות AI החודש: <b className="tabular-nums">{ctx.usedThisMonth} / {plan.monthly_answers}</b></li>
            <li>מנועים: <b>{plan.engines.join(", ")}</b></li>
          </ul>
        </section>

        {site && (
          <>
            <section className={`${card} flex flex-col gap-3`}>
              <h2 className="text-[17px] font-semibold">שמות שהמותג מופיע בהם</h2>
              <p className="text-sm text-muted">כל שם כאן שמופיע בתשובה של ה-AI נספר כאזכור. מפרידים בפסיק.</p>
              <form action={updateBrandTerms} className="flex flex-wrap gap-2">
                {hidden}
                <label htmlFor="brand-terms" className="sr-only">שמות המותג</label>
                <input id="brand-terms" name="terms" defaultValue={(site.brand_terms ?? []).join(", ")} className={`${input} min-w-0 flex-1`} />
                <button className={btn}>שמירה</button>
              </form>
            </section>

            <section className={`${card} flex flex-col gap-4`}>
              <h2 className="text-[17px] font-semibold">
                שאלות שנבדקות <span className="text-sm font-normal text-muted tabular-nums">({activePrompts} / {plan.max_prompts_per_site} פעילות)</span>
              </h2>
              <p className="text-sm text-muted">כל שאלה נשלחת כל שבוע למנועי ה-AI שבמסלול. כדאי לנסח כמו שלקוח אמיתי היה שואל.</p>
              <ul className="flex flex-col divide-y divide-[#EEF1F4] dark:divide-white/5">
                {prompts?.map((p) => (
                  <li key={p.id} className={`flex flex-wrap items-center gap-x-3 gap-y-1 py-2.5 ${p.active ? "" : "opacity-50"}`}>
                    <span className="min-w-0 flex-1">{p.text}</span>
                    {p.topic && <span className="rounded-full bg-[#EEF1F4] px-2 py-0.5 text-xs text-muted dark:bg-white/10">{p.topic}</span>}
                    <form action={togglePrompt}>
                      {hidden}
                      <input type="hidden" name="id" value={p.id} />
                      <input type="hidden" name="active" value={String(p.active)} />
                      <button className={ghost}>{p.active ? "השהיה" : "הפעלה"}</button>
                    </form>
                    <form action={deletePrompt}>
                      {hidden}
                      <input type="hidden" name="id" value={p.id} />
                      <button className={ghost}>מחיקה</button>
                    </form>
                  </li>
                ))}
              </ul>
              <form action={addPrompt} className="grid gap-2 sm:grid-cols-[3fr_1fr_auto]">
                {hidden}
                <label className="sr-only" htmlFor="p-text">שאלה חדשה</label>
                <input id="p-text" name="text" required minLength={5} placeholder="למשל: איפה הכי כדאי לקנות קישורים בישראל?" className={input} />
                <label className="sr-only" htmlFor="p-topic">נושא</label>
                <input id="p-topic" name="topic" placeholder="נושא (לא חובה)" className={input} />
                <button className={btn}>הוספה</button>
              </form>
            </section>

            <section className={`${card} flex flex-col gap-4`}>
              <h2 className="text-[17px] font-semibold">מתחרים ({comps?.length ?? 0})</h2>
              {!comps?.length && <p className="text-sm text-muted">עוד אין מתחרים. בלי מתחרים אין השוואת נתח קול.</p>}
              <ul className="flex flex-col divide-y divide-[#EEF1F4] dark:divide-white/5">
                {comps?.map((c) => (
                  <li key={c.id} className="flex flex-wrap items-center gap-x-3 gap-y-1 py-2.5">
                    <span className="font-medium">{c.name}</span>
                    {c.domain && <span dir="ltr" className="text-sm text-muted">{c.domain}</span>}
                    {!!c.brand_terms?.length && <span className="text-xs text-muted">גם: {c.brand_terms.join(", ")}</span>}
                    <form action={deleteCompetitor} className="ms-auto">
                      {hidden}
                      <input type="hidden" name="id" value={c.id} />
                      <button className={ghost} aria-label={`מחיקת ${c.name}`}>מחיקה</button>
                    </form>
                  </li>
                ))}
              </ul>
              <form action={addCompetitor} className="grid gap-2 sm:grid-cols-[1fr_1fr_1fr_auto]">
                {hidden}
                <label className="sr-only" htmlFor="c-name">שם המתחרה</label>
                <input id="c-name" name="name" required placeholder="שם המתחרה" className={input} />
                <label className="sr-only" htmlFor="c-domain">דומיין</label>
                <input id="c-domain" name="domain" dir="ltr" placeholder="example.co.il" className={input} />
                <label className="sr-only" htmlFor="c-terms">שמות נוספים</label>
                <input id="c-terms" name="terms" placeholder="שמות נוספים, בפסיקים" className={input} />
                <button className={btn}>הוספה</button>
              </form>
            </section>
          </>
        )}

        {site && (
          <section className={`${card} flex flex-col gap-3`}>
            <h2 className="text-[17px] font-semibold">WordPress · {site.name}</h2>
            {wpConn ? (
              <>
                <p className="text-sm">
                  מחובר: <b dir="ltr">{wpConn.wp_url}</b> · משתמש {wpConn.wp_user_name ?? wpConn.username}
                </p>
                <p className="text-sm text-muted">מאמרים מאושרים אפשר לשלוח מכאן כטיוטה, לפרסם או לתזמן.</p>
                <form action={disconnectWordPress}>
                  {hidden}
                  <button className={ghost}>ניתוק WordPress</button>
                </form>
              </>
            ) : (
              <>
                <p className="text-sm text-muted">
                  ב-WordPress נכנסים ל<b>משתמשים ← פרופיל ← סיסמאות אפליקציה</b>, יוצרים סיסמה בשם Lionet Pilot ומדביקים כאן.
                  זו לא הסיסמה הרגילה שלכם, ואפשר לבטל אותה בכל רגע.
                </p>
                <form action={connectWordPress} className="grid gap-2 sm:grid-cols-[1fr_1fr_1fr_auto]">
                  {hidden}
                  <label className="sr-only" htmlFor="wp-url">כתובת האתר</label>
                  <input id="wp-url" name="wp_url" dir="ltr" defaultValue={site.domain} className={input} />
                  <label className="sr-only" htmlFor="wp-user">שם משתמש</label>
                  <input id="wp-user" name="wp_user" required dir="ltr" placeholder="שם משתמש ב-WordPress" autoComplete="off" className={input} />
                  <label className="sr-only" htmlFor="wp-pass">סיסמת אפליקציה</label>
                  <input id="wp-pass" name="wp_pass" type="password" required dir="ltr" placeholder="xxxx xxxx xxxx xxxx xxxx xxxx" autoComplete="new-password" className={input} />
                  <button className={btn}>חיבור ובדיקה</button>
                </form>
              </>
            )}
          </section>
        )}

        <section className={`${card} flex flex-col gap-3`}>
          <h2 className="text-[17px] font-semibold">Google Search Console</h2>
          {!planHasGsc ? (
            <p className="text-sm text-muted">נתוני גוגל (קליקים, חשיפות, מילים ועמודים שירדו) כלולים במסלולי Pro ומעלה.</p>
          ) : !google ? (
            <>
              <p className="text-sm text-muted">מחברים פעם אחת את חשבון הגוגל שבו מנוהל ה-Search Console, והמערכת מושכת את הנתונים כל שבוע. הגישה היא לקריאה בלבד.</p>
              {isOwner && (
                <a href={`/api/google/connect?org=${ctx.org.id}`} className={`${btn} inline-flex items-center self-start`}>חיבור Google</a>
              )}
            </>
          ) : (
            <>
              <p className="text-sm">
                מחובר: <b dir="ltr">{google.google_email ?? "חשבון Google"}</b> · {google.properties.length} נכסים
              </p>
              {site && (
                <form action={setGscProperty} className="flex flex-wrap items-end gap-2">
                  {hidden}
                  <label className="flex min-w-0 flex-1 flex-col gap-1 text-sm">
                    הנכס של {site.name} ב-Search Console
                    <select name="gsc_property" defaultValue={site.gsc_property ?? ""} disabled={!isOwner} className={input} dir="ltr">
                      <option value="">— לא מקושר —</option>
                      {google.properties.map((p: string) => <option key={p} value={p}>{p}</option>)}
                    </select>
                  </label>
                  {isOwner && <button className={btn}>שמירה</button>}
                </form>
              )}
              <div className="flex flex-wrap gap-2">
                {site?.gsc_property && (
                  <form action={syncGscNow}>
                    {hidden}
                    <button className={ghost}>עדכון נתונים עכשיו</button>
                  </form>
                )}
                {isOwner && (
                  <form action={disconnectGoogle}>
                    {hidden}
                    <button className={ghost}>ניתוק Google</button>
                  </form>
                )}
              </div>
              {site?.gsc_synced_at && (
                <p className="text-xs text-muted">עודכן לאחרונה: {new Date(site.gsc_synced_at).toLocaleString("he-IL", { timeZone: "Asia/Jerusalem" })}</p>
              )}
            </>
          )}
        </section>

        <section className={`${card} flex flex-col gap-3`}>
          <h2 className="text-[17px] font-semibold">הוספת אתר</h2>
          {(sites?.length ?? 0) >= plan.max_sites ? (
            <p className="text-sm text-muted">המסלול כולל עד {plan.max_sites} אתרים. כדי להוסיף אתר צריך לשדרג.</p>
          ) : (
            <form action={addSite} className="grid gap-2 sm:grid-cols-[1fr_1fr_auto]">
              <input type="hidden" name="org_id" value={ctx.org.id} />
              <label className="sr-only" htmlFor="s-name">שם המותג</label>
              <input id="s-name" name="name" required placeholder="שם המותג" className={input} />
              <label className="sr-only" htmlFor="s-domain">דומיין</label>
              <input id="s-domain" name="domain" required dir="ltr" placeholder="example.co.il" className={input} />
              <button className={btn}>הוספה</button>
            </form>
          )}
        </section>

        <section className={`${card} flex flex-col gap-3`}>
          <h2 className="text-[17px] font-semibold">דוח שבועי</h2>
          <p className="text-sm text-muted">אחרי כל בדיקה שבועית הדוח מופיע כאן במערכת, ונשלח גם במייל לכל חברי החשבון. אפשר להוסיף גם וואטסאפ.</p>
          <form action={updateNotifications} className="flex flex-col gap-3">
            {hidden}
            <label className="flex items-center gap-2 text-sm">
              <input type="checkbox" name="notify_email" defaultChecked={ctx.org.notify_email} disabled={!isOwner} className="size-5" />
              שליחת הדוח במייל
            </label>
            <label className="flex flex-col gap-1 text-sm">
              מספר וואטסאפ לדוח (לא חובה)
              <input name="whatsapp_to" type="tel" dir="ltr" defaultValue={ctx.org.whatsapp_to ?? ""} disabled={!isOwner}
                placeholder="050-0000000" className={`${input} max-w-xs`} />
            </label>
            {isOwner && <button className={`${btn} self-start`}>שמירה</button>}
          </form>
        </section>
      </main>
    </div>
  );
}
