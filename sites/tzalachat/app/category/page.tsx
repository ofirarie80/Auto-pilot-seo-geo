import Link from "next/link";
import type { Metadata } from "next";
import { categories, foodsIn, LISTS } from "@/lib/data";

export const metadata: Metadata = { title: "כל המאכלים לפי קטגוריות", description: "טבלאות ערכים תזונתיים לפי קטגוריה: פירות, ירקות, לחמים, מוצרי חלב, בשר, דגים, קטניות, אגוזים ועוד.", alternates: { canonical: "/category" } };

export default function Cats() {
  return (
    <div className="wrap">
      <h1>כל המאכלים</h1>
      <p className="lede">בחרו קטגוריה כדי לראות טבלת קלוריות וערכים תזונתיים של כל המאכלים בה, עם מיון לפי חלבון, פחמימות או שומן.</p>
      <ul className="cats">
        {categories.map((c) => <li key={c.slug}><Link href={`/category/${c.slug}`}><span className="em" aria-hidden="true">{c.emoji}</span>{c.name}<span className="count">{foodsIn(c.slug).length} מאכלים</span></Link></li>)}
      </ul>
      <h2>רשימות מדורגות</h2>
      <ul className="tiles">{LISTS.map((l) => <li key={l.slug}><Link href={`/list/${l.slug}`}>{l.title}</Link></li>)}</ul>
    </div>
  );
}
