import Link from "next/link";
import type { Metadata } from "next";
import { categories, foodsIn, CAT_TINT, foods } from "@/lib/data";

export const metadata: Metadata = { title: "כל המאכלים לפי קטגוריות", description: `טבלאות ערכים תזונתיים ל-${foods.length} מאכלים לפי קטגוריה: פירות, ירקות, לחמים, מוצרי חלב, בשר, דגים, קטניות, אגוזים ועוד.`, alternates: { canonical: "/category" } };

export default function Cats() {
  return (
    <div className="wrap">
      <header style={{ padding: "30px 0 10px" }}>
        <h1>כל המאכלים</h1>
        <p className="lede">{foods.length} מאכלים ב-{categories.length} קטגוריות. בכל קטגוריה יש טבלה שאפשר למיין לפי קלוריות, חלבון, פחמימות, שומן או סיבים.</p>
      </header>
      <ul className="cat-grid">
        {categories.map((c) => (
          <li key={c.slug}>
            <Link className="cat-tile" href={`/category/${c.slug}`} style={{ background: CAT_TINT[c.slug] }}>
              <span className="em" aria-hidden="true">{c.emoji}</span>
              <span><b>{c.name}</b><br /><small>{foodsIn(c.slug).length} מאכלים</small></span>
            </Link>
          </li>
        ))}
      </ul>
    </div>
  );
}
