import Link from "next/link";
import { foods, categories, foodsIn, POPULAR, getFood, kcal, LISTS, recipes, recipeTotals, COMPARE_PAIRS, pairSlug, shortName, SITE, inL } from "@/lib/data";
import Search from "@/components/Search";
import JsonLd from "@/components/JsonLd";

export default function Home() {
  const items = foods.map((f) => ({ slug: f.slug, name: f.name, kcal: f.n.kcal ?? 0, aliases: f.aliases }));
  const pop = POPULAR.map((s) => getFood(s)!).filter(Boolean);
  return (
    <div className="wrap">
      <Search items={items} />
      <p className="muted">ערכים תזונתיים מדויקים ל-{foods.length} מאכלים, לכל 100 גרם ולכל מנה.</p>

      <h2>מה מחפשים עכשיו</h2>
      <ul className="tiles">
        {pop.map((f) => <li key={f.slug}><Link href={`/food/${f.slug}`}>{f.name}<small>{kcal((f.n.kcal ?? 0) * f.servings[0].g / 100)} קק&quot;ל {inL(f.servings[0].label)}</small></Link></li>)}
      </ul>

      <h2>לפי קטגוריה</h2>
      <ul className="cats">
        {categories.map((c) => <li key={c.slug}><Link href={`/category/${c.slug}`}><span className="em" aria-hidden="true">{c.emoji}</span>{c.name}<span className="count">{foodsIn(c.slug).length}</span></Link></li>)}
      </ul>

      <h2>כמה קלוריות אתם צריכים ביום?</h2>
      <p>מחשבון לפי גיל, גובה, משקל ורמת פעילות, עם יעד לשמירה, לירידה הדרגתית ולעלייה במסה.</p>
      <div className="cta-row"><Link className="btn" href="/tools/calorie-calculator">לחישוב הצריכה היומית</Link></div>

      <h2>מתכונים עם חישוב קלוריות</h2>
      <ul className="tiles">
        {recipes.map((r) => { const { tot } = recipeTotals(r); return <li key={r.slug}><Link href={`/recipe/${r.slug}`}>{r.name}<small>{kcal(tot.kcal / r.servings)} קק&quot;ל למנה</small></Link></li>; })}
      </ul>

      <h2>מה יותר משמין?</h2>
      <ul className="tiles">
        {COMPARE_PAIRS.slice(0, 8).map(([a, b]) => <li key={a + b}><Link href={`/compare/${pairSlug(a, b)}`}>{shortName(getFood(a)!.name)} מול {shortName(getFood(b)!.name)}</Link></li>)}
      </ul>
      <p><Link href="/compare">לכל ההשוואות</Link></p>

      <h2>רשימות מדורגות</h2>
      <ul className="tiles">{LISTS.map((l) => <li key={l.slug}><Link href={`/list/${l.slug}`}>{l.title}</Link></li>)}</ul>

      <JsonLd data={{ "@context": "https://schema.org", "@type": "WebSite", name: SITE.name, url: SITE.url, inLanguage: "he" }} />
    </div>
  );
}
