"use client";

import { useState } from "react";

export default function CopyButton({ text, label }: { text: string; label: string }) {
  const [done, setDone] = useState(false);
  return (
    <button type="button"
      onClick={async () => {
        try { await navigator.clipboard.writeText(text); setDone(true); setTimeout(() => setDone(false), 2000); } catch { /* ignore */ }
      }}
      className="min-h-11 rounded-md border border-[#C9D2DA] bg-white px-4 text-sm font-semibold text-[#13212E] dark:bg-transparent dark:text-inherit">
      {done ? "הועתק" : label}
    </button>
  );
}
