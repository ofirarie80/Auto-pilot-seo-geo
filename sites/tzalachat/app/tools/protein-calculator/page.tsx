import Link from "next/link";
import type { Metadata } from "next";
import ProteinCalculator from "@/components/ProteinCalculator";
import JsonLd from "@/components/JsonLd";
import { SITE } from "@/lib/data";

export const metadata: Metadata = { title: "מחשבון חלבון: כמה חלבון צריך ביום?", description: "כמה גרם חלבון לאכול ביום לפי משקל ורמת פעילות: מההמלצה הבסיסית של 0.8 גרם לק\"ג ועד הטווחים למתאמני כוח.", alternates: { canonical: "/tools/protein-calculator" } };

const QA = [
  { q: "כמה חלבון צריך ביום?", a: "ההמלצה הבסיסית למבוגרים היא 0.8 גרם חלבון לכל ק\"ג משקל גוף. אדם במשקל 70 ק\"ג צריך לפחות 56 גרם חלבון ביום. לאנשים שמתאמנים באופן קבוע ממליצים בדרך כלל על יותר." },
  { q: "איפה יש הרבה חלבון?", a: "בעוף, דגים, ביצים, מוצרי חלב, קטניות, טופו ואגוזים. ברשימת המזונות העשירים בחלבון אפשר לראות את הדירוג המלא לפי 100 גרם." },
  { q: "האם אפשר לאכול יותר מדי חלבון?", a: "לאנשים בריאים, צריכה של עד כ-2 גרם לק\"ג נחשבת בטוחה. אנשים עם מחלת כליות צריכים להתייעץ עם רופא לפני שהם מעלים את צריכת החלבון." },
];

export default function Page() {
  return (
    <article className="wrap narrow">
      <nav className="crumbs" style={{ marginTop: 22 }}><Link href="/">{SITE.name}</Link> / <Link href="/tools">מחשבונים</Link> / חלבון</nav>
      <h1>מחשבון חלבון</h1>
      <p className="lede">כמה חלבון הגוף שלכם צריך ביום? בחרו משקל ורמת פעילות.</p>
      <ProteinCalculator />
      <p><Link href="/list/מזונות-עשירים-בחלבון">לרשימת המזונות העשירים ביותר בחלבון</Link></p>
      <h2>שאלות נפוצות</h2>
      <div className="faq">{QA.map((x, i) => <details key={x.q} open={i === 0}><summary>{x.q}</summary><p>{x.a}</p></details>)}</div>
      <JsonLd data={{ "@context": "https://schema.org", "@graph": [
        { "@type": "WebApplication", name: "מחשבון חלבון", applicationCategory: "HealthApplication", operatingSystem: "Any", inLanguage: "he", offers: { "@type": "Offer", price: "0", priceCurrency: "ILS" } },
        { "@type": "FAQPage", mainEntity: QA.map((x) => ({ "@type": "Question", name: x.q, acceptedAnswer: { "@type": "Answer", text: x.a } })) },
      ] }} />
    </article>
  );
}
