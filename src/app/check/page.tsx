import CheckForm from "./CheckForm";

export const metadata = {
  title: "בדיקת נראות ב-AI חינם · LIONET",
  description: "בדקו בחינם אם ChatGPT, Claude, Perplexity ו-Gemini יכולים למצוא ולצטט את האתר שלכם. תוצאה תוך פחות מדקה.",
};

export const maxDuration = 60;

export default function CheckPage() {
  return (
    <div className="min-h-screen bg-[#13212E] text-white">
      <main className="mx-auto flex max-w-3xl flex-col gap-8 px-4 py-14 sm:py-20">
        <header className="flex flex-col gap-4">
          <span className="font-mono text-xs tracking-widest text-[#9FB3C3]">LIONET · בדיקת GEO חינם</span>
          <h1 className="text-[clamp(30px,6vw,46px)] font-semibold leading-tight [text-wrap:balance]">
            האם ChatGPT יכול בכלל להמליץ על האתר שלכם?
          </h1>
          <p className="max-w-[60ch] text-lg text-[#C7D3DD]">
            יותר ויותר לקוחות שואלים את ה-AI במקום את גוגל. אם הבוטים חסומים, או שהאתר לא מסביר את עצמו בצורה שהם מבינים,
            הם ימליצו על מישהו אחר. הבדיקה לוקחת פחות מדקה.
          </p>
        </header>
        <CheckForm />
        <footer className="text-sm text-[#9FB3C3]">
          נבדק: גישה של בוטים של ChatGPT, Claude, Perplexity ו-Gemini · llms.txt · Sitemap · Schema של העסק ו-FAQ · כותרות ותיאורים · מהירות
        </footer>
      </main>
    </div>
  );
}
