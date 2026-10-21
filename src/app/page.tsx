import { enabledEngines } from "@/lib/geo/engines";

export const dynamic = "force-dynamic";

type Check = { label: string; ok: boolean; hint: string };

async function dbCheck(): Promise<Check> {
  const label = "מסד נתונים (Supabase)";
  const hint = "להוסיף NEXT_PUBLIC_SUPABASE_URL ו-SUPABASE_SERVICE_ROLE_KEY ולהריץ את קובץ ה-migration";
  try {
    const { supabaseAdmin } = await import("@/lib/supabase/admin");
    const { count, error } = await supabaseAdmin().from("sites").select("id", { count: "exact", head: true });
    if (error) return { label, ok: false, hint: `החיבור עובד אבל הטבלאות חסרות: ${error.message}` };
    return { label, ok: true, hint: `${count ?? 0} אתרים במערכת` };
  } catch {
    return { label, ok: false, hint };
  }
}

export default async function Home() {
  const engines = enabledEngines();
  const checks: Check[] = [
    await dbCheck(),
    { label: "מנועי AI", ok: engines.length > 0, hint: engines.length ? engines.join(" · ") : "להוסיף לפחות מפתח API אחד" },
    { label: "מפתח הרצה (CRON_SECRET)", ok: !!process.env.CRON_SECRET, hint: "מחרוזת אקראית ארוכה" },
  ];

  return (
    <main className="mx-auto grid max-w-2xl gap-8 px-4 py-12">
      <header className="grid gap-2">
        <p className="font-mono text-xs tracking-widest text-muted">LIONET · SEO + GEO</p>
        <h1 className="text-4xl font-semibold">Lionet Pilot</h1>
        <p className="text-muted">טייס אוטומטי לקידום אתרים בגוגל ובמנועי AI.</p>
      </header>
      <section className="grid gap-3">
        <h2 className="text-lg font-semibold">מצב ההתקנה</h2>
        <ul className="grid gap-2">
          {checks.map((c) => (
            <li key={c.label} className="flex items-start gap-3 rounded-lg border border-black/10 p-3 dark:border-white/10">
              <span className={c.ok ? "text-green-600" : "text-amber-600"}>{c.ok ? "✓" : "○"}</span>
              <div>
                <div className="font-medium">{c.label}</div>
                <div className="text-sm text-muted">{c.hint}</div>
              </div>
            </li>
          ))}
        </ul>
      </section>
    </main>
  );
}
