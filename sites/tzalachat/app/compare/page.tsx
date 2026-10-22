import Link from "next/link";
import type { Metadata } from "next";
import { COMPARE_PAIRS, pairSlug, getFood, shortName, kcal } from "@/lib/data";

export const metadata: Metadata = { title: "השוואות ערכים תזונתיים", description: "פיתה או לחם? אורז לבן או מלא? השוואות קלוריות, חלבון ופחמימות בין מאכלים נפוצים.", alternates: { canonical: "/compare" } };

export default function Compare() {
  return (
    <div className="wrap">
      <h1>השוואות</h1>
      <p className="lede">שני מאכלים זה מול זה: קלוריות, חלבון, פחמימות, שומן וסיבים, ל-100 גרם ולמנה רגילה.</p>
      <ul className="tiles">
        {COMPARE_PAIRS.map(([a, b]) => { const fa = getFood(a)!, fb = getFood(b)!; return (
          <li key={a + b}><Link href={`/compare/${pairSlug(a, b)}`}>{shortName(fa.name)} מול {shortName(fb.name)}<small>{kcal(fa.n.kcal)} מול {kcal(fb.n.kcal)} קק&quot;ל</small></Link></li>
        ); })}
      </ul>
    </div>
  );
}
