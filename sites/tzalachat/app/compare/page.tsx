import Link from "next/link";
import type { Metadata } from "next";
import { COMPARE_PAIRS, pairSlug, getFood, shortName, kcal, categories } from "@/lib/data";

export const metadata: Metadata = { title: "השוואות ערכים תזונתיים: מה יותר משמין?", description: `${COMPARE_PAIRS.length} השוואות: פיתה או לחם? אורז לבן או מלא? קלוריות, חלבון ופחמימות בין מאכלים נפוצים.`, alternates: { canonical: "/compare" } };

export default function Compare() {
  const byCat = new Map<string, [string, string][]>();
  for (const p of COMPARE_PAIRS) { const c = getFood(p[0])!.category; byCat.set(c, [...(byCat.get(c) ?? []), p]); }
  return (
    <div className="wrap">
      <header style={{ padding: "30px 0 10px" }}>
        <h1>מה יותר משמין?</h1>
        <p className="lede">{COMPARE_PAIRS.length} השוואות בין מאכלים: קלוריות, חלבון, פחמימות, שומן וסיבים, ל-100 גרם ולמנה רגילה.</p>
      </header>
      {categories.filter((c) => byCat.has(c.slug)).map((c) => (
        <section key={c.slug}>
          <h2>{c.emoji} {c.name}</h2>
          <ul className="cards">
            {byCat.get(c.slug)!.map(([a, b]) => { const fa = getFood(a)!, fb = getFood(b)!; return (
              <li key={a + b}><Link className="card" href={`/compare/${pairSlug(a, b)}`}>
                <span className="t">{shortName(fa.name)} מול {shortName(fb.name)}</span>
                <span className="s">{kcal(fa.n.kcal)} מול {kcal(fb.n.kcal)} קק&quot;ל ל-100 גרם</span>
              </Link></li>
            ); })}
          </ul>
        </section>
      ))}
    </div>
  );
}
