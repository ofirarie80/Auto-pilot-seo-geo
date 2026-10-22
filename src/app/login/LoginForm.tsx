"use client";

import { useActionState, useState } from "react";
import { signIn, signUp, type AuthState } from "./actions";

const input = "min-h-12 w-full rounded-lg border border-[#C9D2DA] bg-white px-4 text-base text-[#13212E]";

export default function LoginForm({ next }: { next: string }) {
  const [mode, setMode] = useState<"in" | "up">("in");
  const [inState, doIn, inPending] = useActionState<AuthState, FormData>(signIn, {});
  const [upState, doUp, upPending] = useActionState<AuthState, FormData>(signUp, {});
  const state = mode === "in" ? inState : upState;
  const pending = mode === "in" ? inPending : upPending;

  return (
    <div className="flex flex-col gap-5">
      <div role="tablist" className="grid grid-cols-2 rounded-lg bg-[#EEF1F4] p-1 text-sm font-medium">
        <button type="button" role="tab" aria-selected={mode === "in"} onClick={() => setMode("in")}
          className={`min-h-10 rounded-md ${mode === "in" ? "bg-white shadow-sm" : "text-[#4E5F6E]"}`}>כניסה</button>
        <button type="button" role="tab" aria-selected={mode === "up"} onClick={() => setMode("up")}
          className={`min-h-10 rounded-md ${mode === "up" ? "bg-white shadow-sm" : "text-[#4E5F6E]"}`}>הרשמה</button>
      </div>
      <form action={mode === "in" ? doIn : doUp} className="flex flex-col gap-3">
        <input type="hidden" name="next" value={next} />
        <label className="flex flex-col gap-1 text-sm font-medium">
          מייל
          <input name="email" type="email" required autoComplete="email" dir="ltr" className={input} />
        </label>
        <label className="flex flex-col gap-1 text-sm font-medium">
          סיסמה
          <input name="password" type="password" required minLength={mode === "up" ? 8 : 1}
            autoComplete={mode === "in" ? "current-password" : "new-password"} dir="ltr" className={input} />
        </label>
        {state.error && <p role="alert" className="text-sm text-[#B42318]">{state.error}</p>}
        {state.info && <p role="status" className="text-sm text-[#1F7A45]">{state.info}</p>}
        <button disabled={pending} className="min-h-12 rounded-lg bg-[#0E7C86] text-base font-semibold text-white disabled:opacity-60">
          {pending ? "רגע…" : mode === "in" ? "כניסה" : "יצירת חשבון"}
        </button>
      </form>
    </div>
  );
}
