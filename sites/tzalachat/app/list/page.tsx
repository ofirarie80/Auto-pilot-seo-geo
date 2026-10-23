import Link from "next/link";
import type { Metadata } from "next";
import { LISTS, categories, NUTRIENTS } from "@/lib/data";

export const metadata: Metadata = { title: "רשימות מדורגות: המזונות העשירים ביותר", description: `${LISTS.length} רשימות מדורגות: המזונות העשירים ביותר בחלבון, סיבים, ברזל, סידן וויטמינים, לפי קטגוריה ובכלל.`, alternates: { canonical: "/list" } };

export default function Lists() {
  const general = LISTS.filter((l) => !l.cats || l.cats.length !== 1);
  return (
    <div className="wrap">
      <header style={{ padding: "30px 0 10px" }}>
        <h1>רשימות מדורגות</h1>
        <p className="lede">איזה מזון הכי עשיר בחלבון? איזה פרי הכי דל בקלוריות? {LISTS.length} דירוגים, כולם מחושבים מאותו מאגר נתונים.</p>
      </header>
      <h2>דירוגים כלליים</h2>
      <ul className="tiles">{general.map((l) => <li key={l.slug}><Link href={`/list/${l.slug}`}>{l.title}<small>לפי {NUTRIENTS[l.key].label}</small></Link></li>)}</ul>
      {categories.map((c) => {
        const ls = LISTS.filter((l) => l.cats?.length === 1 && l.cats[0] === c.slug && !general.includes(l));
        if (!ls.length) return null;
        return (
          <section key={c.slug}>
            <h2>{c.emoji} {c.name}</h2>
            <ul className="tiles">{ls.map((l) => <li key={l.slug}><Link href={`/list/${l.slug}`}>{l.title}</Link></li>)}</ul>
          </section>
        );
      })}
    </div>
  );
}
