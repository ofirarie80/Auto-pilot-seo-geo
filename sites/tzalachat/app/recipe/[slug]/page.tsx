import Link from "next/link";
import { notFound } from "next/navigation";
import type { Metadata } from "next";
import { recipes, getRecipe, recipeTotals, getFood, kcal, fmt, SITE } from "@/lib/data";
import NutritionLabel from "@/components/NutritionLabel";
import JsonLd from "@/components/JsonLd";
import MacroDonut from "@/components/MacroDonut";

export const dynamicParams = false;
export function generateStaticParams() { return recipes.map((r) => ({ slug: r.slug })); }
export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }): Promise<Metadata> {
  const r = getRecipe((await params).slug); if (!r) return {};
  const { tot } = recipeTotals(r);
  return { title: `${r.name}: מתכון וכמה קלוריות יש במנה`, description: `${r.intro} כ-${kcal(tot.kcal / r.servings)} קלוריות ו-${fmt(tot.protein / r.servings)} גרם חלבון למנה.`, alternates: { canonical: `/recipe/${r.slug}` } };
}

export default async function RecipePage({ params }: { params: Promise<{ slug: string }> }) {
  const r = getRecipe((await params).slug); if (!r) notFound();
  const { tot, grams } = recipeTotals(r);
  const per = Object.fromEntries(Object.entries(tot).map(([k, v]) => [k, v / r.servings]));
  const portion = Math.round(grams / r.servings);
  const sameCat = recipes.filter((x) => x.slug !== r.slug && x.category === r.category).slice(0, 6);
  return (
    <article className="wrap">
      <section className="food-hero" style={{ background: "#f3e0cf" }}>
        <nav className="crumbs"><Link href="/">{SITE.name}</Link> / <Link href="/recipe">מתכונים</Link> / {r.name}</nav>
        <div className="food-hero-grid">
          <div>
            <h1>{r.name}</h1>
            <ul className="tags">{[r.category, ...r.tags].filter(Boolean).map((t) => <li key={t}>{t}</li>)}</ul>
            <div className="answer">
              <span className="answer-num">{kcal(per.kcal)}</span><span className="answer-unit">קלוריות למנה</span>
              <div className="answer-of">{r.servings === 1 ? "מנה אחת" : `${r.servings} מנות`}, כ-{portion} גרם למנה · {r.time} דקות</div>
            </div>
            <div className="macros">
              <div className="macro p"><b>{fmt(per.protein)}</b><span>גרם חלבון</span></div>
              <div className="macro c"><b>{fmt(per.carbs)}</b><span>גרם פחמימות</span></div>
              <div className="macro f"><b>{fmt(per.fat)}</b><span>גרם שומן</span></div>
            </div>
          </div>
          <MacroDonut n={per} size={230} center={kcal(per.kcal)} sub={'קק"ל למנה'} />
        </div>
      </section>

      <div className="two-col" style={{ marginTop: 26 }}>
        <div>
          <p className="lede">{r.intro}</p>
          <h2>מצרכים</h2>
          <ul className="ings">
            {r.ingredients.map((i) => { const f = getFood(i.food)!; return (
              <li key={i.food}>{i.label} <span className="muted small">(<Link href={`/food/${f.slug}`}>{f.name}</Link>, {i.g} גרם, {kcal((f.n.kcal ?? 0) * i.g / 100)} קק&quot;ל)</span></li>
            ); })}
          </ul>
          <h2>אופן ההכנה</h2>
          <ol className="steps">{r.steps.map((s, i) => <li key={i}><span>{s}</span></li>)}</ol>
          <p className="small muted">החישוב כולל את המצרכים ברשימה בלבד, בלי מלח ומים. <Link href="/about">איך אנחנו מחשבים</Link>.</p>
          {sameCat.length > 0 && (<>
            <h2>עוד {r.category === "סלטים" ? "סלטים" : `מתכונים: ${r.category}`}</h2>
            <ul className="cards">
              {sameCat.map((x) => { const t = recipeTotals(x).tot; return (
                <li key={x.slug}><Link className="card" href={`/recipe/${x.slug}`}><span className="t">{x.name}</span><span className="kc">{kcal(t.kcal / x.servings)}<small>קק&quot;ל למנה</small></span></Link></li>
              ); })}
            </ul>
          </>)}
        </div>
        <aside><NutritionLabel n={per} per={`למנה (כ-${portion} גרם)`} title="ערכים תזונתיים למנה" /></aside>
      </div>
      <JsonLd data={{
        "@context": "https://schema.org", "@type": "Recipe", name: r.name, description: r.intro, inLanguage: "he",
        recipeCategory: r.category, recipeYield: `${r.servings} מנות`, totalTime: `PT${r.time}M`, recipeIngredient: r.ingredients.map((i) => i.label),
        recipeInstructions: r.steps.map((s) => ({ "@type": "HowToStep", text: s })), keywords: r.tags.join(", "),
        nutrition: { "@type": "NutritionInformation", servingSize: `${portion} גרם`, calories: `${Math.round(per.kcal)} kcal`, proteinContent: `${fmt(per.protein)} g`, carbohydrateContent: `${fmt(per.carbs)} g`, fatContent: `${fmt(per.fat)} g`, fiberContent: `${fmt(per.fiber)} g`, sugarContent: `${fmt(per.sugar)} g`, sodiumContent: `${Math.round(per.sodium)} mg` },
      }} />
    </article>
  );
}
