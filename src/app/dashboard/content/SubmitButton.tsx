"use client";

import { useFormStatus } from "react-dom";

export default function SubmitButton({
  children, pendingText, disabled, variant = "primary",
}: {
  children: React.ReactNode; pendingText?: string; disabled?: boolean; variant?: "primary" | "ghost" | "danger";
}) {
  const { pending } = useFormStatus();
  const cls = {
    primary: "bg-accent text-white",
    ghost: "border border-[#C9D2DA] bg-white text-[#13212E] dark:bg-transparent dark:text-inherit",
    danger: "border border-[#F1C4BF] bg-white text-[#B42318] dark:bg-transparent",
  }[variant];
  return (
    <button disabled={disabled || pending} className={`min-h-11 rounded-md px-4 text-sm font-semibold disabled:opacity-60 ${cls}`}>
      {pending ? pendingText ?? "רגע…" : children}
    </button>
  );
}
