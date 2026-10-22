import Link from "next/link";
import { notFound } from "next/navigation";
import type { Metadata } from "next";
import {
  foods, getFood, getCategory, shortName, scale, fmt, kcal, macroSplit, related, pairsFor, pairSlug, getFood as gf,
  recipes, SITE, NUTRIENTS, LISTS, rankList, inL,
} from "@/lib/data";
import ServingPicker from "@/components/ServingPicker";
import NutritionLabel from "@/components/NutritionLabel";
import JsonLd from "@/components/JsonLd";

export const dynamicParams = false;
export function generateStaticParams() { return foods.map((f) => ({ slug: f.slug })); }

export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }): Promise<Metadata> {
  const f = getFood((await params).slug); if (!f) return {};
  const s = shortName(f.name); const first = f.servings[0];
  return {
    title: `כמה קלוריות יש ב${s}? ערכים תזונתיים מלאים`,
    description: `ב-100 גרם ${s} יש ${kcal(f.n.kcal)} קלוריות, ${fmt(f.n.protein)} גרם חלבון ו-${fmt(f.n.carbs)} גרם פחמימות. ${inL(first.label)} (${first.g} גרם) יש כ-${kcal(scale(f.n.kcal, first.g))} קלוריות. טבלה מלאה עם ויטמינים ומינרלים.`,
    alternates: { canonical: `/food/${f.slug}` },
  };
}

function faqs(f: ReturnType<typeof getFood> & {}) {
  const s = shortName(f.name); const n = f.n;
  const sv = f.servings.map((x) => `${inL(x.label)} (${x.g} גרם) יש כ-${kcal(scale(n.kcal, x.g))} קלוריות`).join(", ");
  const q: { q: string; a: string }[] = [
    { q: `כמה קלוריות יש ב${s}?`, a: `ב-100 גרם ${s} יש ${kcal(n.kcal)} קלוריות. ${sv}.` },
    { q: `כמה חלבון יש ב${s}?`, a: `ב-100 גרם ${s} יש ${fmt(n.protein)} גרם חלבון. ${inL(f.servings[0].label)} יש כ-${fmt(scale(n.protein, f.servings[0].g))} גרם.` },
    { q: `כמה פחמימות יש ב${s}?`, a: `ב-100 גרם ${s} יש ${fmt(n.carbs)} גרם פחמימות${n.sugar != null ? `, מתוכן ${fmt(n.sugar)} גרם סוכרים` : ""}${n.fiber != null ? ` ו-${fmt(n.fiber)} גרם סיבים תזונתיים` : ""}.` },
    { q: `כמה שומן יש ב${s}?`, a: `ב-100 גרם ${s} יש ${fmt(n.fat)} גרם שומן${n.satFat != null ? `, מתוכם ${fmt(n.satFat)} גרם שומן רווי` : ""}.` },
  ];
  const m = macroSplit(n); const top = Object.entries(m).sort((a, b) => b[1] - a[1])[0];
  const lbl: Record<string, string> = { protein: "מחלבון", carbs: "מפחמימות", fat: "משומן" };
  if ((n.kcal ?? 0) > 5) q.push({ q: `מאיפה מגיעות הקלוריות ב${s}?`, a: `כ-${Math.round(top[1])}% מהקלוריות ב${s} מגיעות ${lbl[top[0]]}. החלוקה המלאה: ${Math.round(m.protein)}% חלבון, ${Math.round(m.carbs)}% פחמימות ו-${Math.round(m.fat)}% שומן.` });
  return q;
}

export default async function FoodPage({ params }: { params: Promise<{ slug: string }> }) {
  const f = getFood((await params).slug); if (!f) notFound();
  const cat = getCategory(f.category)!;
  const s = shortName(f.name);
  const m = macroSplit(f.n);
  const qa = faqs(f);
  const rel = related(f);
  const pairs = pairsFor(f.slug);
  const inRecipes = recipes.filter((r) => r.ingredients.some((i) => i.food === f.slug));
  const inLists = LISTS.filter((l) => rankList(l, 10).some((x) => x.slug === f.slug));
  const first = f.servings[0];

  return (
    <article className="wrap narrow">
      <nav className="crumbs" aria-label="פירורי לחם">
        <Link href="/">{SITE.name}</Link> / <Link href={`/category/${cat.slug}`}>{cat.name}</Link> / {f.name}
      </nav>
      <h1>כמה קלוריות יש ב{s}?</h1>

      <ServingPicker servings={f.servings} per100={{ kcal: f.n.kcal ?? 0, protein: f.n.protein ?? 0, carbs: f.n.carbs ?? 0, fat: f.n.fat ?? 0 }} />

      <div aria-label="חלוקת הקלוריות">
        <div className="split" role="img" aria-label={`${Math.round(m.protein)}% חלבון, ${Math.round(m.carbs)}% פחמימות, ${Math.round(m.fat)}% שומן`}>
          <i className="p" style={{ width: `${m.protein}%` }} /><i className="c" style={{ width: `${m.carbs}%` }} /><i className="f" style={{ width: `${m.fat}%` }} />
        </div>
        <p className="small muted">מקור הקלוריות: {Math.round(m.protein)}% חלבון, {Math.round(m.carbs)}% פחמימות, {Math.round(m.fat)}% שומן</p>
      </div>

      <p className="lede">
        ב-100 גרם {f.name} יש {kcal(f.n.kcal)} קלוריות, {fmt(f.n.protein)} גרם חלבון, {fmt(f.n.carbs)} גרם פחמימות ו-{fmt(f.n.fat)} גרם שומן.
        {" "}{inL(first.label)} ({first.g} גרם) יש כ-{kcal(scale(f.n.kcal, first.g))} קלוריות.
      </p>

      <NutritionLabel n={f.n} per={`ל-100 גרם ${f.name}`} />

      <h2>שאלות נפוצות על {s}</h2>
      <div className="faq">
        {qa.map((x, i) => (
          <details key={x.q} open={i === 0}><summary>{x.q}</summary><p>{x.a}</p></details>
        ))}
      </div>

      {pairs.length > 0 && (<>
        <h2>השוואות</h2>
        <ul className="tiles">
          {pairs.map(([a, b]) => { const o = gf(a === f.slug ? b : a)!; return (
            <li key={a + b}><Link href={`/compare/${pairSlug(a, b)}`}>{shortName(f.name)} מול {shortName(o.name)}<small>{kcal(f.n.kcal)} מול {kcal(o.n.kcal)} קק&quot;ל</small></Link></li>
          ); })}
        </ul>
      </>)}

      {inRecipes.length > 0 && (<>
        <h2>מתכונים עם {s}</h2>
        <ul className="tiles">{inRecipes.map((r) => <li key={r.slug}><Link href={`/recipe/${r.slug}`}>{r.name}<small>{r.time} דקות</small></Link></li>)}</ul>
      </>)}

      {inLists.length > 0 && (<>
        <h2>{s} ברשימות שלנו</h2>
        <ul className="tiles">{inLists.map((l) => <li key={l.slug}><Link href={`/list/${l.slug}`}>{l.title}<small>לפי {NUTRIENTS[l.key].label}</small></Link></li>)}</ul>
      </>)}

      <h2>עוד ב{cat.name}</h2>
      <ul className="tiles">
        {rel.map((r) => <li key={r.slug}><Link href={`/food/${r.slug}`}>{r.name}<small>{kcal(r.n.kcal)} קק&quot;ל ל-100 גרם</small></Link></li>)}
      </ul>

      <p className="small muted" style={{ marginTop: 28 }}>
        מקור: USDA FoodData, Standard Reference 28, פריט {f.ndb} ({f.usda}). <Link href="/about">איך אנחנו מחשבים</Link>.
      </p>

      <JsonLd data={{
        "@context": "https://schema.org",
        "@graph": [
          { "@type": "FAQPage", mainEntity: qa.map((x) => ({ "@type": "Question", name: x.q, acceptedAnswer: { "@type": "Answer", text: x.a } })) },
          { "@type": "BreadcrumbList", itemListElement: [
            { "@type": "ListItem", position: 1, name: SITE.name, item: SITE.url },
            { "@type": "ListItem", position: 2, name: cat.name, item: `${SITE.url}/category/${cat.slug}` },
            { "@type": "ListItem", position: 3, name: f.name, item: `${SITE.url}/food/${f.slug}` },
          ] },
        ],
      }} />
    </article>
  );
}
