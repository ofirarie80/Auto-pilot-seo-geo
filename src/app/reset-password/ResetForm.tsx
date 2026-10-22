"use client";

import { useActionState } from "react";
import { updatePassword, type AuthState } from "../login/actions";
import PasswordInput from "../login/PasswordInput";

export default function ResetForm() {
  const [s, action, pending] = useActionState<AuthState, FormData>(updatePassword, {});
  return (
    <form action={action} className="flex flex-col gap-3">
      <PasswordInput id="password" name="password" label="סיסמה חדשה" autoComplete="new-password" minLength={8}
        hint="לפחות 8 תווים." />
      <PasswordInput id="confirm" name="confirm" label="אימות סיסמה" autoComplete="new-password" minLength={8} />
      {s.error && <p role="alert" className="text-sm text-[#B42318]">{s.error}</p>}
      <button disabled={pending} className="min-h-12 w-full rounded-lg bg-[#0E7C86] text-base font-semibold text-white disabled:opacity-60">
        {pending ? "שומר…" : "שמירת סיסמה"}
      </button>
    </form>
  );
}
