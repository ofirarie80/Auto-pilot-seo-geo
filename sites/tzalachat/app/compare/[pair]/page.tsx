import Link from "next/link";
import { notFound } from "next/navigation";
import type { Metadata } from "next";
import { COMPARE_PAIRS, pairSlug, parsePair, shortName, fmt, kcal, scale, NUTRIENTS, SITE } from "@/lib/data";
import JsonLd from "@/components/JsonLd";

export const dynamicParams = false;
export function generateStaticParams() { return COMPARE_PAIRS.map(([a, b]) => ({ pair: pairSlug(a, b) })); }
export async function generateMetadata({ params }: { params: Promise<{ pair: string }> }): Promise<Metadata> {
  const p = parsePair((await params).pair); if (!p) return {};
  const [a, b] = p;
  return { title: `${shortName(a.name)} או ${shortName(b.name)}: מה יותר משמין?`, description: `השוואה מלאה: ב-100 גרם ${shortName(a.name)} יש ${kcal(a.n.kcal)} קלוריות, וב-100 גרם ${shortName(b.name)} יש ${kcal(b.n.kcal)}. חלבון, פחמימות, שומן וסיבים זה מול זה.`, alternates: { canonical: `/compare/${pairSlug(a.slug, b.slug)}` } };
}

const KEYS = ["kcal", "protein", "carbs", "sugar", "fiber", "fat", "satFat", "sodium", "potassium", "calcium", "iron", "vitC"];

export default async function Pair({ params }: { params: Promise<{ pair: string }> }) {
  const p = parsePair((await params).pair); if (!p) notFound();
  const [a, b] = p; const sa = shortName(a.name), sb = shortName(b.name);
  const diff = (a.n.kcal ?? 0) - (b.n.kcal ?? 0);
  const lighter = diff > 0 ? sb : sa, heavier = diff > 0 ? sa : sb;
  const pct = Math.round((Math.abs(diff) / Math.max(1, Math.min(a.n.kcal ?? 1, b.n.kcal ?? 1))) * 100);
  const answer = Math.abs(diff) < 5
    ? `ב-100 גרם, ${sa} ו${sb} כמעט זהים בקלוריות (${kcal(a.n.kcal)} מול ${kcal(b.n.kcal)}).`
    : `ב-100 גרם, ב${heavier} יש כ-${pct}% יותר קלוריות מאשר ב${lighter} (${kcal(Math.max(a.n.kcal ?? 0, b.n.kcal ?? 0))} מול ${kcal(Math.min(a.n.kcal ?? 0, b.n.kcal ?? 0))}).`;
  const portion = `במנה רגילה: ${a.servings[0].label} ${sa} (${a.servings[0].g} גרם) = ${kcal(scale(a.n.kcal, a.servings[0].g))} קלוריות, ו${b.servings[0].label} ${sb} (${b.servings[0].g} גרם) = ${kcal(scale(b.n.kcal, b.servings[0].g))} קלוריות.`;
  return (
    <article className="wrap narrow">
      <nav className="crumbs"><Link href="/">{SITE.name}</Link> / <Link href="/compare">השוואות</Link> / {sa} מול {sb}</nav>
      <h1>{sa} או {sb}: מה יותר משמין?</h1>
      <div className="vs" aria-label="קלוריות ל-100 גרם">
        <div className="side"><b>{kcal(a.n.kcal)}</b><span>{sa}</span></div>
        <div className="mid">מול</div>
        <div className="side"><b>{kcal(b.n.kcal)}</b><span>{sb}</span></div>
      </div>
      <p className="small muted">קלוריות ל-100 גרם</p>
      <p className="lede">{answer} {portion}</p>
      <div className="table-wrap">
        <table className="data">
          <thead><tr><th>ל-100 גרם</th><th className="n"><Link href={`/food/${a.slug}`}>{sa}</Link></th><th className="n"><Link href={`/food/${b.slug}`}>{sb}</Link></th></tr></thead>
          <tbody>
            {KEYS.filter((k) => a.n[k] != null && b.n[k] != null).map((k) => { const meta = NUTRIENTS[k]; return (
              <tr key={k}><td>{meta.label} ({meta.unit})</td><td className="n">{k === "kcal" ? kcal(a.n[k]) : fmt(a.n[k])}</td><td className="n">{k === "kcal" ? kcal(b.n[k]) : fmt(b.n[k])}</td></tr>
            ); })}
          </tbody>
        </table>
      </div>
      <div className="note">השוואה ל-100 גרם לא תמיד משקפת מה שאוכלים בפועל. כדאי להסתכל גם על גודל המנה: {portion}</div>
      <JsonLd data={{ "@context": "https://schema.org", "@type": "FAQPage", mainEntity: [{ "@type": "Question", name: `מה יותר משמין, ${sa} או ${sb}?`, acceptedAnswer: { "@type": "Answer", text: `${answer} ${portion}` } }] }} />
    </article>
  );
}
