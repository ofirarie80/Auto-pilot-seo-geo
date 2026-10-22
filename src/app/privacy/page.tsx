export const metadata = { title: "מדיניות פרטיות · Lionet Pilot" };

// DRAFT — to be reviewed by a lawyer before public launch.
export default function Privacy() {
  return (
    <main className="mx-auto flex max-w-2xl flex-col gap-4 px-4 py-12 leading-7">
      <h1 className="text-3xl font-semibold">מדיניות פרטיות</h1>
      <p className="text-sm text-muted">טיוטה. הנוסח המלא יפורסם לפני ההשקה הציבורית.</p>
      <p>אנחנו שומרים את פרטי החשבון (מייל), את האתרים, השאלות והמתחרים שאתם מגדירים, ואת תוצאות הבדיקות.</p>
      <p>כדי לבצע בדיקות, השאלות שהגדרתם נשלחות לספקי AI (כמו OpenAI). כתובות האתרים נסרקות באופן ציבורי, כמו שעושה מנוע חיפוש.</p>
      <p>הנתונים של כל חשבון נגישים רק לחברי אותו חשבון. איננו מוכרים מידע לצד שלישי.</p>
      <p>הדוחות נשלחים במייל ובוואטסאפ רק למי שהוגדר בחשבון. אפשר לכבות זאת בהגדרות.</p>
      <p>למחיקת החשבון והנתונים: info@lionet.co.il</p>
    </main>
  );
}
