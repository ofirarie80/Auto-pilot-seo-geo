import Link from "next/link";
import type { Metadata } from "next";
import { recipes, recipeTotals, kcal, fmt } from "@/lib/data";

export const metadata: Metadata = { title: "מתכונים עם חישוב קלוריות", description: `${recipes.length} מתכונים ישראליים עם ערכים תזונתיים מחושבים מתוך הרכיבים: קלוריות, חלבון, פחמימות ושומן למנה.`, alternates: { canonical: "/recipe" } };

export default function Recipes() {
  const cats = [...new Set(recipes.map((r) => r.category ?? "אחר"))];
  return (
    <div className="wrap">
      <header style={{ padding: "30px 0 10px" }}>
        <h1>מתכונים עם חישוב קלוריות</h1>
        <p className="lede">כל מתכון כאן מחושב מתוך הרכיבים שלו, גרם אחרי גרם, כך שהקלוריות למנה הן תוצאה של חישוב ולא הערכה.</p>
      </header>
      {cats.map((c) => (
        <section key={c}>
          <h2>{c}</h2>
          <ul className="cards">
            {recipes.filter((r) => (r.category ?? "אחר") === c).map((r) => { const { tot } = recipeTotals(r); return (
              <li key={r.slug}><Link className="card" href={`/recipe/${r.slug}`}>
                <span className="t">{r.name}</span>
                <span className="kc">{kcal(tot.kcal / r.servings)}<small>קק&quot;ל למנה</small></span>
                <span className="s">{fmt(tot.protein / r.servings)} ג&apos; חלבון · {r.time} דקות</span>
              </Link></li>
            ); })}
          </ul>
        </section>
      ))}
    </div>
  );
}
