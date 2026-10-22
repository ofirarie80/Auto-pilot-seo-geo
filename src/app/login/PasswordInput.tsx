"use client";

import { useState } from "react";

export const inputCls =
  "min-h-12 w-full rounded-lg border border-[#C9D2DA] bg-white px-4 text-base text-[#13212E] focus:border-[#0E7C86] focus:outline-none focus:ring-2 focus:ring-[#0E7C86]/30";

/** Password field with a show/hide toggle. */
export default function PasswordInput({
  id, name, label, autoComplete, minLength, hint,
}: {
  id: string; name: string; label: string; autoComplete: string; minLength?: number; hint?: string;
}) {
  const [show, setShow] = useState(false);
  return (
    <div className="flex flex-col gap-1">
      <label htmlFor={id} className="text-sm font-medium">{label}</label>
      <div className="relative">
        <input id={id} name={name} type={show ? "text" : "password"} required minLength={minLength}
          autoComplete={autoComplete} dir="ltr" className={`${inputCls} pe-12`} />
        <button type="button" onClick={() => setShow((s) => !s)} aria-label={show ? "הסתרת הסיסמה" : "הצגת הסיסמה"}
          aria-pressed={show}
          className="absolute inset-y-0 end-0 flex w-12 items-center justify-center text-[#5B6B79] hover:text-[#13212E]">
          {show ? (
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true">
              <path d="M3 3l18 18M10.6 10.6a2 2 0 002.8 2.8M9.9 5.1A9.8 9.8 0 0112 5c5 0 9 4.5 10 7a12.6 12.6 0 01-3.2 4.2M6.6 6.6C4.4 8 2.8 10.1 2 12c1 2.5 5 7 10 7a9.7 9.7 0 004.4-1" />
            </svg>
          ) : (
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true">
              <path d="M2 12c1-2.5 5-7 10-7s9 4.5 10 7c-1 2.5-5 7-10 7S3 14.5 2 12z" />
              <circle cx="12" cy="12" r="3" />
            </svg>
          )}
        </button>
      </div>
      {hint && <span className="text-xs text-[#5B6B79]">{hint}</span>}
    </div>
  );
}
