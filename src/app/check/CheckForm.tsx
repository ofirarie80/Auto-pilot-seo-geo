"use client";

import { useActionState } from "react";
import { runFreeCheck, saveLead, type CheckState } from "./actions";

const STATUS = {
  pass: { label: "תקין", cls: "bg-[#E1F3E8] text-[#1F7A45]" },
  warn: { label: "לשפר", cls: "bg-[#FBEFD9] text-[#8A4B00]" },
  fail: { label: "בעיה", cls: "bg-[#FDE8E6] text-[#B42318]" },
} as const;

const input = "min-h-12 w-full rounded-lg border border-[#C9D2DA] bg-white px-4 text-base text-[#13212E]";
const btn = "min-h-12 rounded-lg bg-[#0E7C86] px-6 text-base font-semibold text-white disabled:opacity-60";

function verdict(score: number) {
  if (score >= 80) return "האתר במצב טוב מבחינה טכנית. השאלה הבאה היא אם ה-AI באמת ממליץ עליכם.";
  if (score >= 55) return "יש בסיס, אבל כמה דברים מקשים על מנועי AI להבין ולצטט את האתר.";
  return "מנועי AI מתקשים להגיע לאתר או להבין אותו. כנראה שהם ממליצים על מתחרים במקומכם.";
}

export default function CheckForm() {
  const [check, runCheck, checking] = useActionState<CheckState, FormData>(runFreeCheck, { stage: "idle" });
  const [lead, sendLead, sending] = useActionState<CheckState, FormData>(saveLead, { stage: "idle" });

  return (
    <div className="flex flex-col gap-6">
      <form action={runCheck} className="flex flex-col gap-2 sm:flex-row">
        <label htmlFor="domain" className="sr-only">כתובת האתר</label>
        <input id="domain" name="domain" required dir="ltr" placeholder="example.co.il" className={`${input} sm:flex-1`} />
        <button disabled={checking} className={btn}>{checking ? "בודק…" : "בדיקה חינם"}</button>
      </form>

      {check.stage === "error" && <p role="alert" className="text-[#B42318]">{check.message}</p>}

      {check.stage === "result" && (
        <section aria-live="polite" className="flex flex-col gap-5 rounded-xl border border-[#DCE2E8] bg-white p-5 text-[#13212E] sm:p-7">
          <div className="flex flex-wrap items-end gap-x-6 gap-y-2">
            <div>
              <div className="text-sm text-[#4E5F6E]">מוכנות ל-AI · <span dir="ltr">{check.domain}</span></div>
              <div className="text-5xl font-semibold tabular-nums">{check.score}<span className="text-2xl text-[#5B6B79]">/100</span></div>
            </div>
            <p className="max-w-[46ch] flex-1 text-[15px]">{verdict(check.score)}</p>
          </div>
          <ul className="flex flex-col gap-2.5">
            {[...check.checks]
              .sort((a, b) => ["fail", "warn", "pass"].indexOf(a.status) - ["fail", "warn", "pass"].indexOf(b.status))
              .map((c) => (
                <li key={c.id} className="flex flex-col gap-1 rounded-lg border border-[#EEF1F4] p-3">
                  <div className="flex items-center justify-between gap-2">
                    <span className="font-medium">{c.title}</span>
                    <span className={`rounded-full px-2 py-0.5 text-xs font-semibold ${STATUS[c.status].cls}`}>{STATUS[c.status].label}</span>
                  </div>
                  <span className="text-sm text-[#4E5F6E]">{c.detail}</span>
                  {c.fix && <span className="text-sm">{c.fix}</span>}
                </li>
              ))}
          </ul>

          <div className="flex flex-col gap-3 rounded-lg bg-[#E0F1F2] p-4 sm:p-5">
            <h2 className="text-lg font-semibold">ומה ChatGPT באמת אומר עליכם?</h2>
            <p className="text-[15px] text-[#23404A]">
              הבדיקה הזאת טכנית בלבד. בבדיקה המלאה אנחנו שואלים את ChatGPT, Claude, Gemini ו-Perplexity את השאלות
              שהלקוחות שלכם שואלים, ומראים מי מוזכר, מי מצוטט, ואיפה המתחרים עוקפים אתכם.
            </p>
            {lead.stage === "lead-saved" ? (
              <p className="font-semibold text-[#1F7A45]">קיבלנו. נחזור אליכם עם הדוח המלא.</p>
            ) : (
              <form action={sendLead} className="grid gap-2 sm:grid-cols-[1fr_1fr_auto]">
                <input type="hidden" name="id" value={check.id ?? ""} />
                <input type="hidden" name="domain" value={check.domain} />
                <label htmlFor="name" className="sr-only">שם</label>
                <input id="name" name="name" placeholder="שם" autoComplete="name" className={input} />
                <label htmlFor="phone" className="sr-only">טלפון</label>
                <input id="phone" name="phone" required type="tel" dir="ltr" placeholder="050-0000000" autoComplete="tel" className={input} />
                <button disabled={sending} className={btn}>{sending ? "שולח…" : "אני רוצה דוח מלא"}</button>
                {lead.stage === "error" && <p role="alert" className="text-sm text-[#B42318] sm:col-span-3">{lead.message}</p>}
              </form>
            )}
          </div>
        </section>
      )}
    </div>
  );
}
