"use client";

import { useActionState } from "react";
import { createWorkspace, type OnboardState } from "./actions";

const input = "min-h-12 w-full rounded-lg border border-[#C9D2DA] bg-white px-4 text-base text-[#13212E]";

export default function OnboardForm() {
  const [state, action, pending] = useActionState<OnboardState, FormData>(createWorkspace, {});
  return (
    <form action={action} className="flex flex-col gap-4">
      <label className="flex flex-col gap-1 text-sm font-medium">
        שם העסק או הסוכנות
        <input name="org" required placeholder="למשל: LIONET" className={input} />
      </label>
      <label className="flex flex-col gap-1 text-sm font-medium">
        שם המותג כמו שלקוחות קוראים לו
        <input name="site" required placeholder="למשל: iLINK" className={input} />
      </label>
      <label className="flex flex-col gap-1 text-sm font-medium">
        כתובת האתר
        <input name="domain" required dir="ltr" placeholder="example.co.il" className={input} />
      </label>
      {state.error && <p role="alert" className="text-sm text-[#B42318]">{state.error}</p>}
      <button disabled={pending} className="min-h-12 rounded-lg bg-[#0E7C86] text-base font-semibold text-white disabled:opacity-60">
        {pending ? "מקים, סורק את האתר ומכין שאלות… (עד חצי דקה)" : "המשך"}
      </button>
    </form>
  );
}
