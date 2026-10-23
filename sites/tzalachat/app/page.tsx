import Link from "next/link";
import {
  foods, categories, foodsIn, POPULAR, getFood, kcal, LISTS, recipes, recipeTotals, COMPARE_PAIRS, pairSlug,
  shortName, SITE, CAT_TINT, inL,
} from "@/lib/data";
import Search from "@/components/Search";
import JsonLd from "@/components/JsonLd";
import MacroDonut from "@/components/MacroDonut";
import FoodCard from "@/components/FoodCard";

export default function Home() {
  const items = foods.map((f) => ({ slug: f.slug, name: f.name, kcal: f.n.kcal ?? 0, aliases: f.aliases }));
  const pop = POPULAR.map((s) => getFood(s)!).filter(Boolean);
  const hero = getFood("פיתה")!;
  const heroServing = hero.servings[0];
  const featuredRecipes = ["סביח", "שקשוקה", "פלאפל-בפיתה", "מרק-עדשים-כתומות", "שניצל", "סלט-יווני"]
    .map((s) => recipes.find((r) => r.slug === s)!).filter(Boolean);
  return (
    <>
      <section className="hero">
        <div className="wrap hero-grid">
          <div>
            <h1>מה יש לך <span className="mark">בצלחת?</span></h1>
            <p className="lede">קלוריות, חלבון, פחמימות, ויטמינים ומינרלים ל-{foods.length} מאכלים. לכל 100 גרם, ולמנה כמו שאוכלים אותה באמת: פיתה, כף, חופן.</p>
            <Search items={items} />
            <div className="quick" aria-label="חיפושים נפוצים">
              {pop.slice(0, 8).map((f) => <Link key={f.slug} href={`/food/${f.slug}`}>{shortName(f.name)}</Link>)}
            </div>
            <div className="stats">
              <span><b>{foods.length}</b>מאכלים</span>
              <span><b>{recipes.length}</b>מתכונים מחושבים</span>
              <span><b>{COMPARE_PAIRS.length}</b>השוואות</span>
              <span><b>{LISTS.length}</b>רשימות מדורגות</span>
            </div>
          </div>
          <figure className="hero-art">
            <MacroDonut n={hero.n} size={320} center={`${kcal(((hero.n.kcal ?? 0) * heroServing.g) / 100)} קק"ל`} sub={`${inL(heroServing.label)}`} />
            <figcaption>מאיפה מגיעות הקלוריות <Link href={`/food/${hero.slug}`}>בפיתה</Link></figcaption>
          </figure>
        </div>
      </section>

      <section className="section" style={{ paddingTop: 12 }}>
        <div className="wrap">
          <div className="section-head"><h2>מה מחפשים עכשיו</h2><Link href="/category">לכל המאכלים</Link></div>
          <ul className="cards">{pop.map((f) => <li key={f.slug}><FoodCard f={f} /></li>)}</ul>
        </div>
      </section>

      <section className="section">
        <div className="wrap">
          <div className="section-head"><h2>לפי קטגוריה</h2></div>
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
      </section>

      <section className="section">
        <div className="wrap">
          <div className="band">
            <div>
              <h2>כמה קלוריות אתם צריכים ביום?</h2>
              <p>ארבעה נתונים ותשובה מיידית: צריכה לשמירה, לירידה הדרגתית ולעלייה במסה. ולידו מחשבוני BMI וחלבון.</p>
              <div className="cta-row">
                <Link className="btn" href="/tools/calorie-calculator">למחשבון הקלוריות</Link>
                <Link className="btn ghost" href="/tools/bmi">מחשבון BMI</Link>
              </div>
            </div>
            <div className="big" aria-hidden="true">2,000</div>
          </div>
        </div>
      </section>

      <section className="section">
        <div className="wrap">
          <div className="section-head"><h2>מתכונים עם חישוב קלוריות</h2><Link href="/recipe">לכל {recipes.length} המתכונים</Link></div>
          <ul className="cards">
            {featuredRecipes.map((r) => { const { tot } = recipeTotals(r); return (
              <li key={r.slug}><Link className="card" href={`/recipe/${r.slug}`}>
                <span className="t">{r.name}</span>
                <span className="kc">{kcal(tot.kcal / r.servings)}<small>קק&quot;ל למנה</small></span>
                <span className="s">{r.category} · {r.time} דקות</span>
              </Link></li>
            ); })}
          </ul>
        </div>
      </section>

      <section className="section">
        <div className="wrap">
          <div className="section-head"><h2>מה יותר משמין?</h2><Link href="/compare">לכל ההשוואות</Link></div>
          <ul className="cards">
            {COMPARE_PAIRS.slice(0, 9).map(([a, b]) => (
              <li key={a + b}><Link className="card vs-card" href={`/compare/${pairSlug(a, b)}`}>
                <span>{shortName(getFood(a)!.name)}</span><span className="x">מול</span><span>{shortName(getFood(b)!.name)}</span>
              </Link></li>
            ))}
          </ul>
        </div>
      </section>

      <section className="section">
        <div className="wrap">
          <div className="section-head"><h2>רשימות מדורגות</h2><Link href="/list">לכל הרשימות</Link></div>
          <ul className="tiles">{LISTS.slice(0, 12).map((l) => <li key={l.slug}><Link href={`/list/${l.slug}`}>{l.title}</Link></li>)}</ul>
        </div>
      </section>

      <JsonLd data={{ "@context": "https://schema.org", "@type": "WebSite", name: SITE.name, url: SITE.url, inLanguage: "he" }} />
    </>
  );
}
