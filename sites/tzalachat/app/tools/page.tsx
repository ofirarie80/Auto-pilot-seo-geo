import Link from "next/link";
import type { Metadata } from "next";

export const metadata: Metadata = { title: "מחשבונים: קלוריות, BMI וחלבון", description: "מחשבון קלוריות יומי, מחשבון BMI ומחשבון חלבון. תוצאה מיידית, בעברית, בלי הרשמה.", alternates: { canonical: "/tools" } };

const TOOLS = [
  { href: "/tools/calorie-calculator", t: "מחשבון קלוריות יומי", d: "כמה קלוריות לאכול ביום כדי לשמור על המשקל, לרדת בהדרגה או לעלות במסה.", em: "🔥" },
  { href: "/tools/bmi", t: "מחשבון BMI", d: "מדד מסת גוף לפי גובה ומשקל, וטווח המשקל התקין לגובה שלכם.", em: "⚖️" },
  { href: "/tools/protein-calculator", t: "מחשבון חלבון", d: "כמה גרם חלבון לאכול ביום לפי המשקל ורמת הפעילות.", em: "💪" },
];

export default function Tools() {
  return (
    <div className="wrap">
      <header style={{ padding: "30px 0 10px" }}>
        <h1>מחשבונים</h1>
        <p className="lede">תוצאה מיידית, בלי הרשמה. כל מחשבון מסביר על איזו נוסחה הוא מבוסס.</p>
      </header>
      <ul className="cat-grid" style={{ gridTemplateColumns: "repeat(auto-fill, minmax(260px, 1fr))" }}>
        {TOOLS.map((x, i) => (
          <li key={x.href}>
            <Link className="cat-tile" href={x.href} style={{ background: ["#f6d9d9", "#e3ecf7", "#dff1d3"][i], minHeight: 170 }}>
              <span className="em" aria-hidden="true">{x.em}</span>
              <span><b>{x.t}</b><br /><small>{x.d}</small></span>
            </Link>
          </li>
        ))}
      </ul>
    </div>
  );
}
