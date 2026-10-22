import Link from "next/link";
import type { Metadata } from "next";
import { recipes, recipeTotals, kcal } from "@/lib/data";

export const metadata: Metadata = { title: "מתכונים עם חישוב קלוריות", description: "מתכונים ישראליים עם ערכים תזונתיים מחושבים מתוך הרכיבים: קלוריות, חלבון, פחמימות ושומן למנה.", alternates: { canonical: "/recipe" } };

export default function Recipes() {
  return (
    <div className="wrap">
      <h1>מתכונים עם חישוב קלוריות</h1>
      <p className="lede">כל מתכון כאן מחושב מתוך הרכיבים שלו, גרם אחרי גרם, כך שהקלוריות למנה הן תוצאה של חישוב ולא הערכה.</p>
      <ul className="tiles">
        {recipes.map((r) => { const { tot } = recipeTotals(r); return (
          <li key={r.slug}><Link href={`/recipe/${r.slug}`}>{r.name}<small>{kcal(tot.kcal / r.servings)} קק&quot;ל למנה · {r.time} דק&apos;</small></Link></li>
        ); })}
      </ul>
    </div>
  );
}
