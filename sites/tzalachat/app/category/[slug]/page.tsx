import Link from "next/link";
import { notFound } from "next/navigation";
import type { Metadata } from "next";
import { categories, getCategory, foodsIn, fmt, kcal, SITE } from "@/lib/data";

export const dynamicParams = false;
export function generateStaticParams() { return categories.map((c) => ({ slug: c.slug })); }
export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }): Promise<Metadata> {
  const c = getCategory((await params).slug); if (!c) return {};
  return { title: `טבלת קלוריות: ${c.name}`, description: `כמה קלוריות, חלבון, פחמימות ושומן יש ב${c.name}? טבלה מלאה ל-100 גרם, ${foodsIn(c.slug).length} מאכלים.`, alternates: { canonical: `/category/${c.slug}` } };
}

export default async function Cat({ params }: { params: Promise<{ slug: string }> }) {
  const c = getCategory((await params).slug); if (!c) notFound();
  const list = foodsIn(c.slug).sort((a, b) => (a.n.kcal ?? 0) - (b.n.kcal ?? 0));
  return (
    <div className="wrap">
      <nav className="crumbs"><Link href="/">{SITE.name}</Link> / <Link href="/category">מאכלים</Link> / {c.name}</nav>
      <h1>טבלת קלוריות: {c.name}</h1>
      <p className="lede">{list.length} מאכלים, מסודרים מהדל ביותר בקלוריות לעשיר ביותר. כל הערכים ל-100 גרם. לחצו על מאכל כדי לראות ערכים לפי מנה, ויטמינים ומינרלים.</p>
      <div className="table-wrap">
        <table className="data">
          <thead><tr><th>מאכל</th><th className="n">קלוריות</th><th className="n">חלבון (ג&apos;)</th><th className="n">פחמימות (ג&apos;)</th><th className="n">שומן (ג&apos;)</th><th className="n">סיבים (ג&apos;)</th></tr></thead>
          <tbody>
            {list.map((f) => (
              <tr key={f.slug}>
                <td><Link href={`/food/${f.slug}`}>{f.name}</Link></td>
                <td className="n">{kcal(f.n.kcal)}</td><td className="n">{fmt(f.n.protein)}</td><td className="n">{fmt(f.n.carbs)}</td><td className="n">{fmt(f.n.fat)}</td><td className="n">{fmt(f.n.fiber)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
