import Link from "next/link";
import { getSiteReport, ENGINES, ENGINE_LABEL, type Cell } from "@/lib/geo/report";
import { latestAudit } from "@/lib/audit/run";
import type { CheckStatus } from "@/lib/audit/geo-audit";
import { getOrgContext, type OrgContext } from "@/lib/auth";
import AppHeader from "./AppHeader";
import { runNow } from "./actions";

export const dynamic = "force-dynamic";
export const maxDuration = 300;
export const metadata = { title: "דשבורד · Lionet Pilot" };

const card = "rounded-[10px] border border-[#DCE2E8] bg-white p-5 dark:border-white/10 dark:bg-[#17212B]";

function Delta({ v }: { v: number | null }) {
  if (v == null || v === 0) return null;
  return (
    <span className={`text-[13px] font-semibold ${v > 0 ? "text-[#1F7A45]" : "text-[#B42318]"}`}>
      {v > 0 ? "▲" : "▼"} {Math.abs(v)}
    </span>
  );
}

const CELL: Record<Cell, { label: string; cls: string }> = {
  cited: { label: "צוטט", cls: "rounded-full bg-[#E1F3E8] px-2 py-0.5 text-xs font-semibold text-[#1F7A45]" },
  mentioned: { label: "הוזכר", cls: "rounded-full bg-[#E0F1F2] px-2 py-0.5 text-xs font-semibold text-[#0E7C86]" },
  none: { label: "—", cls: "text-[#8A97A3]" },
  na: { label: "·", cls: "text-[#C3CCD4]" },
};

const STATUS: Record<CheckStatus, { label: string; cls: string }> = {
  pass: { label: "תקין", cls: "bg-[#E1F3E8] text-[#1F7A45]" },
  warn: { label: "לשפר", cls: "bg-[#FBEFD9] text-[#8A4B00]" },
  fail: { label: "בעיה", cls: "bg-[#FDE8E6] text-[#B42318]" },
};

async function AuditSection({ db, siteId }: { db: OrgContext["db"]; siteId: string }) {
  const a = await latestAudit(db, siteId);
  const ordered = a ? [...a.checks].sort((x, y) => ["fail", "warn", "pass"].indexOf(x.status) - ["fail", "warn", "pass"].indexOf(y.status)) : [];
  return (
    <section className={`${card} flex flex-col gap-4`}>
      <div className="flex flex-wrap items-baseline justify-between gap-3">
        <h2 className="text-[17px] font-semibold">מוכנות טכנית ל-AI</h2>
        {a && (
          <span className="text-sm text-muted">
            ציון <b className="text-2xl text-foreground tabular-nums">{a.score}</b>/100 · נבדק{" "}
            {new Date(a.created_at).toLocaleDateString("he-IL", { timeZone: "Asia/Jerusalem" })}
          </span>
        )}
      </div>
      {!a ? (
        <p className="text-sm text-muted">הסריקה הטכנית תרוץ יחד עם הבדיקה השבועית הבאה.</p>
      ) : (
        <ul className="grid gap-2.5 [grid-template-columns:repeat(auto-fit,minmax(300px,1fr))]">
          {ordered.map((c) => (
            <li key={c.id} className="flex flex-col gap-1 rounded-lg border border-[#EEF1F4] p-3 dark:border-white/5">
              <div className="flex items-center justify-between gap-2">
                <span className="font-medium">{c.title}</span>
                <span className={`rounded-full px-2 py-0.5 text-xs font-semibold ${STATUS[c.status].cls}`}>{STATUS[c.status].label}</span>
              </div>
              <span className="text-xs text-muted">{c.detail}</span>
              {c.fix && <span className="text-sm">{c.fix}</span>}
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}

function Trend({ points }: { points: { week: string; rate: number }[] }) {
  if (points.length < 2) {
    return <p className="text-sm text-muted">הגרף יופיע אחרי שבועיים של בדיקות.</p>;
  }
  const max = Math.max(50, ...points.map((p) => p.rate));
  const x = (i: number) => 50 + (i * 560) / (points.length - 1);
  const y = (v: number) => 170 - (v / max) * 150;
  const line = points.map((p, i) => `${x(i)},${y(p.rate)}`).join(" ");
  const last = points[points.length - 1];
  return (
    <svg viewBox="0 0 640 210" role="img" aria-label={`מגמת אזכור: ${points[0].rate}% עד ${last.rate}%`} className="h-auto w-full" style={{ direction: "ltr" }}>
      {[0, 0.5, 1].map((t) => (
        <g key={t}>
          <line x1="44" x2="620" y1={y(max * t)} y2={y(max * t)} stroke="#DCE2E8" />
          <text x="36" y={y(max * t) + 4} textAnchor="end" fontSize="11" fill="#5B6B79">{Math.round(max * t)}%</text>
        </g>
      ))}
      <polygon points={`50,170 ${line} 610,170`} fill="#0E7C86" fillOpacity="0.1" />
      <polyline points={line} fill="none" stroke="#0E7C86" strokeWidth="2.5" strokeLinejoin="round" />
      <circle cx={x(points.length - 1)} cy={y(last.rate)} r="5" fill="#0E7C86" />
      <text x={x(points.length - 1)} y={y(last.rate) - 12} textAnchor="middle" fontSize="12" fill="currentColor">{last.rate}%</text>
      {points.map((p, i) => (
        <text key={p.week} x={x(i)} y="194" textAnchor="middle" fontSize="10" fill="#5B6B79">{p.week.slice(5).split("-").reverse().join(".")}</text>
      ))}
    </svg>
  );
}

export default async function Dashboard({
  searchParams,
}: {
  searchParams: Promise<{ site?: string; org?: string; msg?: string; welcome?: string }>;
}) {
  const { site, org, msg, welcome } = await searchParams;
  const ctx = await getOrgContext(org);
  const r = await getSiteReport(ctx.db, site, ctx.org.id);

  if (!r) {
    return (
      <div className="min-h-screen">
        <AppHeader ctx={ctx} sites={[]} />
        <main className="mx-auto max-w-2xl px-4 py-16">
          <p className="mb-4">אין עדיין אתרים בחשבון.</p>
          <Link href={`/dashboard/settings?org=${ctx.org.id}`} className="text-accent underline">הוספת אתר</Link>
        </main>
      </div>
    );
  }

  const leader = r.shareOfVoice.find((c) => !c.isSite);
  const kpis = [
    { label: "אחוז אזכור", value: `${r.mentionRate}%`, delta: r.delta.mentionRate, hint: "מכל התשובות בבדיקה האחרונה" },
    { label: "אחוז ציטוט כמקור", value: `${r.citationRate}%`, delta: r.delta.citationRate, hint: "האתר הופיע ברשימת המקורות" },
    { label: "מיקום ממוצע", value: r.avgPosition?.toString() ?? "—", delta: null, hint: "בין המותגים שהוזכרו (1 = ראשון)" },
    { label: "מתחרה מוביל", value: leader ? `${leader.rate}%` : "—", delta: null, hint: leader?.name ?? "עוד לא הוגדרו מתחרים" },
  ];

  return (
    <div className="min-h-screen">
      <AppHeader ctx={ctx} sites={r.sites} currentSite={r.site.id} />

      <main className="mx-auto flex max-w-[1280px] flex-col gap-6 px-4 pb-12 pt-7 sm:px-8">
        {welcome && (
          <p role="status" className="rounded-lg border border-accent bg-[#E0F1F2] p-4 text-[#23404A]">
            החשבון מוכן. סרקנו את האתר והכנו שאלות ראשונות. אפשר לערוך אותן בהגדרות, ואז להריץ בדיקה.
          </p>
        )}
        {msg && <p role="status" className="rounded-lg border border-[#DCE2E8] bg-white p-4 dark:bg-[#17212B]">{msg}</p>}
        <div className="flex flex-wrap items-end gap-3">
        <div className="flex min-w-0 flex-1 flex-col gap-1">
          <h1 className="text-[28px] font-semibold">נראות ב-AI · {r.site.name}</h1>
          <p className="text-sm text-muted">
            {r.hasData
              ? `${r.answers} תשובות בבדיקה האחרונה · ${r.runAt ? new Date(r.runAt).toLocaleString("he-IL", { timeZone: "Asia/Jerusalem" }) : ""} · בדיקה הבאה: יום ראשון 08:00`
              : "עוד לא רצה בדיקה לאתר הזה."}
          </p>
        </div>
        <form action={runNow}>
          <input type="hidden" name="site_id" value={r.site.id} />
          <input type="hidden" name="org_id" value={ctx.org.id} />
          <button className="min-h-11 rounded-lg bg-accent px-5 text-sm font-semibold text-white">הרצת בדיקה עכשיו</button>
        </form>
        </div>

        <AuditSection db={ctx.db} siteId={r.site.id} />

        {!r.hasData ? (
          <section className={card}>
            <h2 className="mb-2 text-lg font-semibold">מחכים לבדיקה הראשונה</h2>
            <p className="text-sm text-muted">
              {r.prompts.length
                ? `יש ${r.prompts.length} שאלות מוכנות. התוצאות יופיעו כאן אחרי ההרצה הראשונה.`
                : "לאתר הזה עוד אין שאלות. צריך להוסיף אותן לפני הבדיקה הראשונה."}
            </p>
          </section>
        ) : (
          <>
            <section aria-label="מדדים עיקריים" className="grid gap-4 [grid-template-columns:repeat(auto-fit,minmax(220px,1fr))]">
              {kpis.map((k) => (
                <div key={k.label} className={`${card} flex flex-col gap-1.5`}>
                  <div className="text-[13px] text-muted">{k.label}</div>
                  <div className="flex items-baseline gap-2.5">
                    <span className="text-[34px] font-semibold tabular-nums">{k.value}</span>
                    <Delta v={k.delta} />
                  </div>
                  <div className="text-xs text-muted">{k.hint}</div>
                </div>
              ))}
            </section>

            <div className="flex flex-wrap gap-4">
              <section className={`${card} flex min-w-0 flex-[3_1_560px] flex-col gap-3`}>
                <h2 className="text-[17px] font-semibold">אחוז אזכור לאורך זמן</h2>
                <Trend points={r.trend} />
              </section>
              <section className={`${card} flex min-w-0 flex-[2_1_340px] flex-col gap-3.5`}>
                <h2 className="text-[17px] font-semibold">לפי מנוע AI</h2>
                {r.byEngine.map((e) => (
                  <div key={e.engine} className="flex flex-col gap-1.5">
                    <div className="flex justify-between text-sm">
                      <span className="font-medium">{e.label}</span>
                      <span className="font-mono tabular-nums">{e.rate}%</span>
                    </div>
                    <div className="h-2.5 overflow-hidden rounded bg-[#EEF1F4] dark:bg-white/10">
                      <div className="h-full rounded bg-accent" style={{ width: `${e.rate}%` }} />
                    </div>
                  </div>
                ))}
              </section>
            </div>

            <div className="flex flex-wrap gap-4">
              <section className={`${card} flex min-w-0 flex-[3_1_560px] flex-col gap-3`}>
                <h2 className="text-[17px] font-semibold">השאלות שנבדקו</h2>
                <div className="overflow-x-auto">
                  <table className="w-full min-w-[620px] border-collapse text-sm">
                    <thead>
                      <tr className="text-right text-xs text-muted">
                        <th className="border-b border-[#DCE2E8] px-2.5 py-2 font-medium">שאלה</th>
                        {ENGINES.map((e) => (
                          <th key={e} className="border-b border-[#DCE2E8] px-1.5 py-2 text-center font-medium">{ENGINE_LABEL[e]}</th>
                        ))}
                      </tr>
                    </thead>
                    <tbody>
                      {r.prompts.map((p) => (
                        <tr key={p.id}>
                          <td className="border-b border-[#EEF1F4] p-2.5 dark:border-white/5">{p.text}</td>
                          {ENGINES.map((e) => (
                            <td key={e} className="border-b border-[#EEF1F4] px-1.5 py-2.5 text-center dark:border-white/5">
                              <span className={CELL[p.cells[e]].cls}>{CELL[p.cells[e]].label}</span>
                            </td>
                          ))}
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </section>

              <div className="flex min-w-0 flex-[2_1_340px] flex-col gap-4">
                <section className={`${card} flex flex-col gap-3`}>
                  <h2 className="text-[17px] font-semibold">נתח קול מול מתחרים</h2>
                  {r.shareOfVoice.length < 2 && <p className="text-sm text-muted">עוד לא הוגדרו מתחרים לאתר.</p>}
                  {r.shareOfVoice.map((c) => (
                    <div key={c.name} className="grid grid-cols-[110px_minmax(0,1fr)_48px] items-center gap-2.5 text-sm">
                      <span className={c.isSite ? "font-semibold text-accent" : ""}>{c.name}</span>
                      <div className="h-2.5 overflow-hidden rounded bg-[#EEF1F4] dark:bg-white/10">
                        <div className={`h-full rounded ${c.isSite ? "bg-accent" : "bg-[#9AA8B4]"}`} style={{ width: `${c.rate}%` }} />
                      </div>
                      <span className="text-left font-mono tabular-nums">{c.rate}%</span>
                    </div>
                  ))}
                </section>
                <section className={`${card} flex flex-col gap-2.5`}>
                  <h2 className="text-[17px] font-semibold">האתרים שה-AI מצטט הכי הרבה</h2>
                  <p className="text-xs text-muted">כאן כדאי להשיג אזכור או קישור</p>
                  <ol className="flex list-decimal flex-col gap-1.5 ps-5 text-sm">
                    {r.topCited.map((s) => (
                      <li key={s.domain}>
                        <span className="flex justify-between gap-2">
                          <span dir="ltr">{s.domain}</span>
                          <span className="font-mono text-muted">{s.count}</span>
                        </span>
                      </li>
                    ))}
                  </ol>
                </section>
              </div>
            </div>
            <section className={`${card} flex flex-col gap-3`}>
              <h2 className="text-[17px] font-semibold">דוחות קודמים</h2>
              <div className="overflow-x-auto">
                <table className="w-full min-w-[420px] border-collapse text-sm">
                  <thead>
                    <tr className="text-right text-xs text-muted">
                      <th className="border-b border-[#DCE2E8] px-2.5 py-2 font-medium">תאריך</th>
                      <th className="border-b border-[#DCE2E8] px-2.5 py-2 font-medium">תשובות</th>
                      <th className="border-b border-[#DCE2E8] px-2.5 py-2 font-medium">אזכור</th>
                      <th className="border-b border-[#DCE2E8] px-2.5 py-2 font-medium">ציטוט</th>
                    </tr>
                  </thead>
                  <tbody>
                    {r.history.map((h) => (
                      <tr key={h.runId}>
                        <td className="border-b border-[#EEF1F4] p-2.5 dark:border-white/5">{h.at ? new Date(h.at).toLocaleString("he-IL", { timeZone: "Asia/Jerusalem" }) : "—"}</td>
                        <td className="border-b border-[#EEF1F4] p-2.5 tabular-nums dark:border-white/5">{h.answers}</td>
                        <td className="border-b border-[#EEF1F4] p-2.5 tabular-nums dark:border-white/5">{h.mentionRate}%</td>
                        <td className="border-b border-[#EEF1F4] p-2.5 tabular-nums dark:border-white/5">{h.citationRate}%</td>
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
