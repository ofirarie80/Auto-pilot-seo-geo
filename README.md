# Lionet Pilot

טייס אוטומטי לקידום אתרים בגוגל (SEO) ובמנועי AI (GEO). שימוש פנימי לאתרי LIONET, ובהמשך SaaS למקדמים.

## מה יש כרגע (שלב 1: מעקב GEO)

- **מבנה Multi-tenant**: ארגונים, משתמשים, אתרים, מתחרים, פרומפטים ותוצאות, עם הרשאות RLS.
- **מנוע GEO**: שולח כל שאלה ל-ChatGPT, Claude, Gemini ו-Perplexity עם חיפוש ברשת פעיל, ובודק:
  - האם המותג הוזכר, ובאיזה מקום ביחס למתחרים
  - האם האתר צוטט כמקור
  - אילו מתחרים הוזכרו ואילו אתרים צוטטו
- **הרצה שבועית אוטומטית** (Vercel Cron, ימי ראשון 08:00 שעון ישראל).
- **דף מצב התקנה** בכתובת הראשית של האתר.

## מבנה

```
supabase/migrations/0001_init.sql   מבנה הטבלאות וההרשאות
supabase/seed.sql                   ארגון LIONET, שלושת האתרים ו-10 שאלות ראשונות ל-iLINK
src/lib/geo/engines.ts              פנייה ל-4 מנועי ה-AI
src/lib/geo/analyze.ts              ניתוח תשובה: אזכור, ציטוט, מיקום, מתחרים
src/lib/geo/run.ts                  הרצה מלאה לאתר ושמירת התוצאות
src/app/api/geo/run/route.ts        נקודת ההפעלה (מוגנת ב-CRON_SECRET)
```

## התקנה

1. **Supabase**: פרויקט חדש → SQL Editor → להריץ את `0001_init.sql` ואז את `seed.sql`.
2. **Vercel**: Import לריפו הזה → Settings → Environment Variables → למלא לפי `.env.example`.
3. לפתוח את כתובת האתר ב-Vercel ולוודא שכל הבדיקות ירוקות.
4. הרצה ידנית ראשונה:
   ```
   curl -H "Authorization: Bearer <CRON_SECRET>" https://<your-app>.vercel.app/api/geo/run
   ```

## הבא בתור

דשבורד תוצאות, הוספת מתחרים, ומעבר ל-Trigger.dev להרצות ארוכות.
