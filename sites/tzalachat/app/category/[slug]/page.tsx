import Link from "next/link";
import { notFound } from "next/navigation";
import type { Metadata } from "next";
import { categories, getCategory, foodsIn, kcal, SITE, CAT_TINT, LISTS } from "@/lib/data";
import FoodTable from "@/components/FoodTable";
import FoodCard from "@/components/FoodCard";

export const dynamicParams = false;
export function generateStaticParams() { return categories.map((c) => ({ slug: c.slug })); }
export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }): Promise<Metadata> {
  const c = getCategory((await params).slug); if (!c) return {};
  return { title: `טבלת קלוריות: ${c.name}`, description: `כמה קלוריות, חלבון, פחמימות ושומן יש ב${c.name}? טבלה מלאה ל-100 גרם, ${foodsIn(c.slug).length} מאכלים, עם מיון לפי כל ערך.`, alternates: { canonical: `/category/${c.slug}` } };
}

export default async function Cat({ params }: { params: Promise<{ slug: string }> }) {
  const c = getCategory((await params).slug); if (!c) notFound();
  const list = foodsIn(c.slug);
  const rows = list.map((f) => ({ slug: f.slug, name: f.name, kcal: f.n.kcal ?? 0, protein: f.n.protein ?? 0, carbs: f.n.carbs ?? 0, fat: f.n.fat ?? 0, fiber: f.n.fiber ?? 0 }));
  const lightest = [...list].sort((a, b) => (a.n.kcal ?? 0) - (b.n.kcal ?? 0))[0];
  const heaviest = [...list].sort((a, b) => (b.n.kcal ?? 0) - (a.n.kcal ?? 0))[0];
  const catLists = LISTS.filter((l) => l.cats?.length === 1 && l.cats[0] === c.slug);
  return (
    <div className="wrap">
      <header className="page-head" style={{ background: CAT_TINT[c.slug] }}>
        <span className="em" aria-hidden="true">{c.emoji}</span>
        <div>
          <nav className="crumbs"><Link href="/">{SITE.name}</Link> / <Link href="/category">מאכלים</Link> / {c.name}</nav>
          <h1>טבלת קלוריות: {c.name}</h1>
          <p>{list.length} מאכלים. הדל ביותר בקלוריות: {lightest.name} ({kcal(lightest.n.kcal)} קק&quot;ל ל-100 גרם). העשיר ביותר: {heaviest.name} ({kcal(heaviest.n.kcal)}).</p>
        </div>
      </header>
      <h2>הנפוצים ביותר</h2>
      <ul className="cards">{list.slice(0, 8).map((f) => <li key={f.slug}><FoodCard f={f} /></li>)}</ul>
      <h2 style={{ marginTop: 34 }}>כל {list.length} המאכלים</h2>
      <p className="muted small">לחצו על כותרת עמודה כדי למיין לפיה.</p>
      <FoodTable rows={rows} />
      {catLists.length > 0 && (<>
        <h2 style={{ marginTop: 34 }}>דירוגים ב{c.name}</h2>
        <ul className="tiles">{catLists.map((l) => <li key={l.slug}><Link href={`/list/${l.slug}`}>{l.title}</Link></li>)}</ul>
      </>)}
    </div>
  );
}
