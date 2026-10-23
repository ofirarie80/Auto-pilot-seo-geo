import type { Metadata, Viewport } from "next";
import Link from "next/link";
import "./globals.css";
import { SITE, categories, LISTS, foods, recipes } from "@/lib/data";
import Logo from "@/components/Logo";

export const metadata: Metadata = {
  metadataBase: new URL(SITE.url),
  title: { default: `${SITE.name}: ערכים תזונתיים, קלוריות ומחשבונים בעברית`, template: `%s | ${SITE.name}` },
  description: `כמה קלוריות, חלבון, פחמימות ושומן יש בכל מאכל: ערכים תזונתיים ל-${foods.length} מאכלים לכל 100 גרם ולכל מנה, השוואות, ${recipes.length} מתכונים עם חישוב תזונתי ומחשבוני קלוריות, BMI וחלבון.`,
  openGraph: { siteName: SITE.name, locale: "he_IL", type: "website" },
  alternates: { canonical: "/" },
  robots: { index: true, follow: true, "max-snippet": -1, "max-image-preview": "large" } as Metadata["robots"],
};

export const viewport: Viewport = { width: "device-width", initialScale: 1, themeColor: "#fbfaf6" };

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="he" dir="rtl">
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="" />
        <link rel="stylesheet" href="https://fonts.googleapis.com/css2?family=IBM+Plex+Sans+Hebrew:wght@400;600;700&family=Secular+One&display=swap" />
      </head>
      <body>
        <header className="site-head">
          <div className="wrap">
            <Link href="/" className="logo" aria-label={`${SITE.name}, לדף הבית`}><Logo />{SITE.name}</Link>
            <nav className="nav" aria-label="ניווט ראשי">
              <Link href="/category">מאכלים</Link>
              <Link href="/recipe">מתכונים</Link>
              <Link href="/compare" className="hide-s">השוואות</Link>
              <Link href="/list" className="hide-s">רשימות</Link>
              <Link href="/tools" className="cta">מחשבונים</Link>
            </nav>
          </div>
        </header>
        <main>{children}</main>
        <footer className="site-foot">
          <div className="wrap">
            <div className="cols">
              <div>
                <div className="brand"><Logo />{SITE.name}</div>
                <p>{SITE.tagline}. {foods.length} מאכלים, {recipes.length} מתכונים, כל מספר מגובה במקור.</p>
              </div>
              <div>
                <h4>קטגוריות</h4>
                <ul>{categories.slice(0, 7).map((c) => <li key={c.slug}><Link href={`/category/${c.slug}`}>{c.name}</Link></li>)}</ul>
              </div>
              <div>
                <h4>&nbsp;</h4>
                <ul>{categories.slice(7).map((c) => <li key={c.slug}><Link href={`/category/${c.slug}`}>{c.name}</Link></li>)}</ul>
              </div>
              <div>
                <h4>רשימות פופולריות</h4>
                <ul>{LISTS.slice(0, 7).map((l) => <li key={l.slug}><Link href={`/list/${l.slug}`}>{l.title}</Link></li>)}</ul>
              </div>
              <div>
                <h4>כלים ומידע</h4>
                <ul>
                  <li><Link href="/tools/calorie-calculator">מחשבון קלוריות יומי</Link></li>
                  <li><Link href="/tools/bmi">מחשבון BMI</Link></li>
                  <li><Link href="/tools/protein-calculator">מחשבון חלבון</Link></li>
                  <li><Link href="/about">מקורות ושיטת העבודה</Link></li>
                  <li><a href="/llms.txt">סיכום לבוטים של AI</a></li>
                  <li><a href="/sitemap.xml">מפת אתר</a></li>
                </ul>
              </div>
            </div>
            <p style={{ marginTop: 26 }}>
              הנתונים התזונתיים מבוססים על מאגר משרד החקלאות האמריקאי (USDA SR28). המידע באתר הוא כללי ואינו תחליף לייעוץ של דיאטנית או רופא.
            </p>
          </div>
        </footer>
      </body>
    </html>
  );
}
