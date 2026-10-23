"use client";
import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";

type Item = { slug: string; name: string; kcal: number; aliases: string[] };

export default function Search({ items }: { items: Item[] }) {
  const [q, setQ] = useState("");
  const [sel, setSel] = useState(0);
  const router = useRouter();
  const results = useMemo(() => {
    const s = q.trim();
    if (!s) return [];
    return items
      .map((it) => {
        const names = [it.name, ...it.aliases];
        const score = names.some((n) => n.startsWith(s)) ? 0 : names.some((n) => n.includes(s)) ? 1 : 9;
        return { it, score };
      })
      .filter((x) => x.score < 9)
      .sort((a, b) => a.score - b.score || a.it.name.length - b.it.name.length)
      .slice(0, 8)
      .map((x) => x.it);
  }, [q, items]);
  const go = (slug: string) => router.push(`/food/${slug}`);
  return (
    <div className="search" role="search">
      <div className="field">
        <input
          id="food-q" type="search" autoComplete="off" placeholder="חפשו מאכל: פיתה, ביצה, אבוקדו..." value={q}
          aria-label="חיפוש מאכל"
          role="combobox" aria-expanded={results.length > 0} aria-controls="food-results" aria-autocomplete="list"
          onChange={(e) => { setQ(e.target.value); setSel(0); }}
          onKeyDown={(e) => {
            if (e.key === "ArrowDown") { e.preventDefault(); setSel((s) => Math.min(s + 1, results.length - 1)); }
            if (e.key === "ArrowUp") { e.preventDefault(); setSel((s) => Math.max(s - 1, 0)); }
            if (e.key === "Enter" && results[sel]) go(results[sel].slug);
          }}
        />
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" aria-hidden="true">
          <circle cx="11" cy="11" r="7" /><path d="m20 20-3.5-3.5" />
        </svg>
      </div>
      {results.length > 0 && (
        <ul id="food-results" role="listbox">
          {results.map((r, i) => (
            <li key={r.slug} role="option" aria-selected={i === sel}>
              <a href={`/food/${r.slug}`} aria-selected={i === sel}>{r.name}<small>{Math.round(r.kcal)} קק&quot;ל ל-100 גרם</small></a>
            </li>
          ))}
        </ul>
      )}
      {q.trim() && results.length === 0 && <p className="empty">לא מצאנו את &quot;{q}&quot; עדיין. נסו שם כללי יותר, למשל &quot;לחם&quot; או &quot;גבינה&quot;.</p>}
    </div>
  );
}
