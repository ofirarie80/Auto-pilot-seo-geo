import Link from "next/link";

export default function Home() {
  return (
    <div className="min-h-screen bg-[#13212E] text-white">
      <main className="mx-auto flex max-w-3xl flex-col gap-8 px-4 py-16 sm:py-24">
        <span className="font-mono text-xs tracking-widest text-[#9FB3C3]">LIONET PILOT · SEO + GEO</span>
        <h1 className="text-[clamp(32px,6vw,52px)] font-semibold leading-tight [text-wrap:balance]">
          תדעו מה ChatGPT אומר על העסק שלכם. כל שבוע.
        </h1>
        <p className="max-w-[60ch] text-lg text-[#C7D3DD]">
          Lionet Pilot שואל את ChatGPT, Claude, Gemini ו-Perplexity את השאלות שהלקוחות שלכם שואלים, מודד מי מוזכר ומי מצוטט,
          ומראה מה לתקן כדי שימליצו עליכם במקום על המתחרים.
        </p>
        <div className="flex flex-wrap gap-3">
          <Link href="/check" className="min-h-12 rounded-lg bg-[#0E7C86] px-6 py-3 font-semibold text-white">בדיקה חינם</Link>
          <Link href="/login" className="min-h-12 rounded-lg border border-[#3A5266] px-6 py-3 font-semibold text-white">כניסה / הרשמה</Link>
        </div>
      </main>
    </div>
  );
}
