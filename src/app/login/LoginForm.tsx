"use client";

import Link from "next/link";
import { useActionState, useState } from "react";
import { signIn, signUp, requestReset, resendConfirmation, signInWithGoogle, type AuthState } from "./actions";
import PasswordInput, { inputCls } from "./PasswordInput";

type Mode = "in" | "up" | "forgot";
const btn = "min-h-12 w-full rounded-lg bg-[#0E7C86] text-base font-semibold text-white disabled:opacity-60";
const link = "text-sm font-medium text-[#0E7C86] underline-offset-2 hover:underline";

function Status({ s }: { s: AuthState }) {
  return (
    <>
      {s.error && <p role="alert" className="text-sm text-[#B42318]">{s.error}</p>}
      {s.info && <p role="status" className="text-sm text-[#1F7A45]">{s.info}</p>}
    </>
  );
}

function EmailField({ defaultValue }: { defaultValue?: string }) {
  return (
    <div className="flex flex-col gap-1">
      <label htmlFor="email" className="text-sm font-medium">מייל</label>
      <input id="email" name="email" type="email" required autoComplete="email" dir="ltr" defaultValue={defaultValue} className={inputCls} />
    </div>
  );
}

export default function LoginForm({ next, google, initialInfo }: { next: string; google: boolean; initialInfo?: string }) {
  const [mode, setMode] = useState<Mode>("in");
  const [inS, doIn, inP] = useActionState<AuthState, FormData>(signIn, { info: initialInfo });
  const [upS, doUp, upP] = useActionState<AuthState, FormData>(signUp, {});
  const [fgS, doFg, fgP] = useActionState<AuthState, FormData>(requestReset, {});
  const [rsS, doRs, rsP] = useActionState<AuthState, FormData>(resendConfirmation, {});

  return (
    <div className="flex flex-col gap-5">
      {mode !== "forgot" && (
        <div role="tablist" className="grid grid-cols-2 rounded-lg bg-[#EEF1F4] p-1 text-sm font-medium">
          {(["in", "up"] as const).map((m) => (
            <button key={m} type="button" role="tab" aria-selected={mode === m} onClick={() => setMode(m)}
              className={`min-h-10 rounded-md ${mode === m ? "bg-white shadow-sm" : "text-[#4E5F6E]"}`}>
              {m === "in" ? "כניסה" : "הרשמה"}
            </button>
          ))}
        </div>
      )}

      {mode === "in" && (
        <form action={doIn} className="flex flex-col gap-3">
          <input type="hidden" name="next" value={next} />
          <EmailField defaultValue={inS.email} />
          <PasswordInput id="password" name="password" label="סיסמה" autoComplete="current-password" />
          <button type="button" onClick={() => setMode("forgot")} className={`${link} self-start`}>שכחתי סיסמה</button>
          <Status s={inS} />
          <button disabled={inP} className={btn}>{inP ? "נכנס…" : "כניסה"}</button>
        </form>
      )}

      {mode === "up" && (
        <>
          <form action={doUp} className="flex flex-col gap-3">
            <EmailField defaultValue={upS.email} />
            <PasswordInput id="new-password" name="password" label="סיסמה" autoComplete="new-password" minLength={8}
              hint="לפחות 8 תווים. מומלץ לשלב אותיות ומספרים." />
            <PasswordInput id="confirm" name="confirm" label="אימות סיסמה" autoComplete="new-password" minLength={8} />
            <label className="flex items-start gap-2 text-sm">
              <input type="checkbox" name="terms" required className="mt-0.5 size-5 shrink-0" />
              <span>
                קראתי ואני מסכים/ה ל<Link href="/terms" target="_blank" className={link}>תנאי השימוש</Link> ול
                <Link href="/privacy" target="_blank" className={link}>מדיניות הפרטיות</Link>
              </span>
            </label>
            <Status s={upS} />
            <button disabled={upP} className={btn}>{upP ? "יוצר חשבון…" : "יצירת חשבון"}</button>
          </form>
          {upS.info && (
            <form action={doRs} className="flex flex-col gap-2 rounded-lg bg-[#EEF1F4] p-3 text-sm">
              <input type="hidden" name="email" value={upS.email ?? ""} />
              <span>המייל לא הגיע? בודקים גם בספאם, או:</span>
              <button disabled={rsP} className={`${link} self-start`}>{rsP ? "שולח…" : "שליחה חוזרת של מייל האישור"}</button>
              <Status s={rsS} />
            </form>
          )}
        </>
      )}

      {mode === "forgot" && (
        <form action={doFg} className="flex flex-col gap-3">
          <h2 className="text-lg font-semibold">איפוס סיסמה</h2>
          <p className="text-sm text-[#4E5F6E]">נשלח לכם מייל עם קישור לבחירת סיסמה חדשה.</p>
          <EmailField defaultValue={fgS.email ?? inS.email} />
          <Status s={fgS} />
          <button disabled={fgP} className={btn}>{fgP ? "שולח…" : "שליחת קישור"}</button>
          <button type="button" onClick={() => setMode("in")} className={`${link} self-start`}>חזרה לכניסה</button>
        </form>
      )}

      {google && mode !== "forgot" && (
        <form action={signInWithGoogle} className="flex flex-col gap-3">
          <input type="hidden" name="next" value={next} />
          <div className="flex items-center gap-3 text-xs text-[#5B6B79]">
            <span className="h-px flex-1 bg-[#DCE2E8]" />או<span className="h-px flex-1 bg-[#DCE2E8]" />
          </div>
          <button className="min-h-12 w-full rounded-lg border border-[#C9D2DA] bg-white text-base font-medium text-[#13212E]">
            המשך עם Google
          </button>
        </form>
      )}
    </div>
  );
}
