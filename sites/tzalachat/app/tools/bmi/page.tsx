import Link from "next/link";
import type { Metadata } from "next";
import BmiCalculator from "@/components/BmiCalculator";
import JsonLd from "@/components/JsonLd";
import { SITE } from "@/lib/data";

export const metadata: Metadata = { title: "מחשבון BMI: מדד מסת גוף לפי גובה ומשקל", description: "מחשבון BMI בעברית: מזינים גובה ומשקל ומקבלים את מדד מסת הגוף, הקטגוריה לפי ארגון הבריאות העולמי וטווח המשקל התקין לגובה.", alternates: { canonical: "/tools/bmi" } };

const QA = [
  { q: "איך מחשבים BMI?", a: "מחלקים את המשקל בקילוגרמים בריבוע הגובה במטרים. למשל, אדם בגובה 1.70 מטר ובמשקל 70 ק\"ג: 70 חלקי 2.89, כלומר BMI של 24.2." },
  { q: "מה נחשב BMI תקין?", a: "לפי ארגון הבריאות העולמי, BMI בין 18.5 ל-24.9 נחשב תקין למבוגרים. 25 עד 29.9 הוא עודף משקל, ו-30 ומעלה הוא השמנה." },
  { q: "האם BMI מדויק לכולם?", a: "לא. BMI לא מבחין בין שריר לשומן, ולכן אצל ספורטאים עם מסת שריר גבוהה הוא עלול להראות עודף משקל. הוא גם לא מיועד לילדים ולנשים בהריון." },
];

export default function Page() {
  return (
    <article className="wrap narrow">
      <nav className="crumbs" style={{ marginTop: 22 }}><Link href="/">{SITE.name}</Link> / <Link href="/tools">מחשבונים</Link> / BMI</nav>
      <h1>מחשבון BMI</h1>
      <p className="lede">מזינים גובה ומשקל, והמחשבון מראה את מדד מסת הגוף ואת טווח המשקל התקין לגובה שלכם.</p>
      <BmiCalculator />
      <h2>שאלות נפוצות</h2>
      <div className="faq">{QA.map((x, i) => <details key={x.q} open={i === 0}><summary>{x.q}</summary><p>{x.a}</p></details>)}</div>
      <JsonLd data={{ "@context": "https://schema.org", "@graph": [
        { "@type": "WebApplication", name: "מחשבון BMI", applicationCategory: "HealthApplication", operatingSystem: "Any", inLanguage: "he", offers: { "@type": "Offer", price: "0", priceCurrency: "ILS" } },
        { "@type": "FAQPage", mainEntity: QA.map((x) => ({ "@type": "Question", name: x.q, acceptedAnswer: { "@type": "Answer", text: x.a } })) },
      ] }} />
    </article>
  );
}
