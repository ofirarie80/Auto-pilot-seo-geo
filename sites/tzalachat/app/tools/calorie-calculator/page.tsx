import Link from "next/link";
import type { Metadata } from "next";
import CalorieCalculator from "@/components/CalorieCalculator";
import JsonLd from "@/components/JsonLd";
import { SITE } from "@/lib/data";

export const metadata: Metadata = {
  title: "מחשבון קלוריות יומי: כמה קלוריות צריך לאכול ביום?",
  description: "מחשבון קלוריות לפי גיל, גובה, משקל ורמת פעילות. כמה קלוריות צריך לאכול ביום כדי לשמור על המשקל, לרדת בהדרגה או לעלות במסה.",
  alternates: { canonical: "/tools/calorie-calculator" },
};

const QA = [
  { q: "כמה קלוריות צריך לאכול ביום?", a: "זה תלוי בגיל, מין, גובה, משקל ורמת פעילות. לאישה בת 30 בגובה 165 ס\"מ ובמשקל 65 ק\"ג עם פעילות קלה, צריכת השמירה היא כ-1,880 קלוריות ביום. המחשבון בעמוד מחשב את המספר המדויק עבורכם." },
  { q: "מה ההבדל בין BMR לצריכה היומית?", a: "BMR הוא מספר הקלוריות שהגוף שורף במנוחה מלאה, רק כדי לתפקד. הצריכה היומית (TDEE) מוסיפה את הפעילות הגופנית והתנועה במהלך היום, ולכן היא תמיד גבוהה יותר." },
  { q: "כמה קלוריות להוריד כדי לרדת במשקל?", a: "גירעון מתון של 300–500 קלוריות ביום נחשב בר־קיימא לרוב האנשים. גירעון גדול יותר קשה להתמיד בו ועלול לפגוע במסת השריר. המחשבון מציג גירעון של כ-400 קלוריות, עם רצפה של 1,200 קלוריות לנשים ו-1,500 לגברים." },
];

export default function Page() {
  return (
    <article className="wrap narrow">
      <nav className="crumbs" style={{ marginTop: 22 }}><Link href="/">{SITE.name}</Link> / <Link href="/tools">מחשבונים</Link> / מחשבון קלוריות</nav>
      <h1>מחשבון קלוריות יומי</h1>
      <p className="lede">כמה קלוריות הגוף שלכם צריך ביום? מלאו ארבעה נתונים והתוצאה תתעדכן מיד.</p>
      <CalorieCalculator />
      <h2>שאלות נפוצות</h2>
      <div className="faq">{QA.map((x, i) => <details key={x.q} open={i === 0}><summary>{x.q}</summary><p>{x.a}</p></details>)}</div>
      <JsonLd data={{ "@context": "https://schema.org", "@graph": [
        { "@type": "WebApplication", name: "מחשבון קלוריות יומי", applicationCategory: "HealthApplication", operatingSystem: "Any", inLanguage: "he", offers: { "@type": "Offer", price: "0", priceCurrency: "ILS" } },
        { "@type": "FAQPage", mainEntity: QA.map((x) => ({ "@type": "Question", name: x.q, acceptedAnswer: { "@type": "Answer", text: x.a } })) },
      ] }} />
    </article>
  );
}
