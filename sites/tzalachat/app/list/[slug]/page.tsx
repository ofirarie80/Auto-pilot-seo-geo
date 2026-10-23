import Link from "next/link";
import { notFound } from "next/navigation";
import type { Metadata } from "next";
import { LISTS, getList, rankList, NUTRIENTS, fmt, kcal, scale, SITE, inL, CAT_TINT, getCategory } from "@/lib/data";
import JsonLd from "@/components/JsonLd";

export const dynamicParams = false;
export function generateStaticParams() { return LISTS.map((l) => ({ slug: l.slug })); }
export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }): Promise<Metadata> {
  const l = getList((await params).slug); if (!l) return {};
  const top = rankList(l, 3).map((f) => f.name).join(", ");
  return { title: l.h1, description: `${l.title}, מדורגים לפי ${NUTRIENTS[l.key].label} ל-100 גרם. בראש הרשימה: ${top}.`, alternates: { canonical: `/list/${l.slug}` } };
}

export default async function List({ params }: { params: Promise<{ slug: string }> }) {
  const l = getList((await params).slug); if (!l) notFound();
  const rows = rankList(l); const meta = NUTRIENTS[l.key];
  const max = Math.max(...rows.map((f) => f.n[l.key] ?? 0), 1);
  const cat = l.cats?.length === 1 ? getCategory(l.cats[0]) : undefined;
  const val = (v: number | null) => (l.key === "kcal" ? kcal(v) : fmt(v));
  const related = LISTS.filter((x) => x.slug !== l.slug && (x.key === l.key || (cat && x.cats?.[0] === cat.slug))).slice(0, 12);
  return (
    <article className="wrap narrow">
      <header className="page-head" style={{ background: cat ? CAT_TINT[cat.slug] : "#efe9f1" }}>
        {cat && <span className="em" aria-hidden="true">{cat.emoji}</span>}
        <div>
          <nav className="crumbs"><Link href="/">{SITE.name}</Link> / <Link href="/list">רשימות</Link> / {l.title}</nav>
          <h1>{l.h1}</h1>
          <p>{l.intro}</p>
        </div>
      </header>
      <div className="table-wrap">
        <table className="data">
          <thead><tr><th className="rank">#</th><th>מאכל</th><th className="n">{meta.label} ל-100 ג&apos;</th><th className="n">במנה</th></tr></thead>
          <tbody>
            {rows.map((f, i) => (
              <tr key={f.slug}>
                <td className="rank">{i + 1}</td>
                <td><Link href={`/food/${f.slug}`}>{f.name}</Link></td>
                <td className="n"><span className="bar-cell"><span className="bar" style={{ width: `${Math.round(((f.n[l.key] ?? 0) / max) * 80)}px` }} />{val(f.n[l.key])} {meta.unit}</span></td>
                <td className="n small">{val(scale(f.n[l.key], f.servings[0].g))} {inL(f.servings[0].label)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      {related.length > 0 && (<>
        <h2>רשימות קשורות</h2>
        <ul className="tiles">{related.map((x) => <li key={x.slug}><Link href={`/list/${x.slug}`}>{x.title}</Link></li>)}</ul>
      </>)}
      <JsonLd data={{ "@context": "https://schema.org", "@type": "ItemList", name: l.h1, itemListElement: rows.map((f, i) => ({ "@type": "ListItem", position: i + 1, name: f.name, url: `${SITE.url}/food/${f.slug}` })) }} />
    </article>
  );
}
