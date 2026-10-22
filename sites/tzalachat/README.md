# צלחת: אתר ערכים תזונתיים (SEO פרוגרמטי)

אתר Next.js סטטי שמייצר דף לכל מאכל, קטגוריה, השוואה, רשימה ומתכון מתוך מאגר נתונים אחד.

- נתונים: `data/foods.json` (נבנה מ-USDA SR28, נחלת הכלל) ו-`data/recipes.json`.
- הוספת מאכלים: עריכת `scripts/foods_he.py` (מיפוי עברי ← מספר פריט USDA), ואז `python3 scripts/build_data.py`.
- מתכונים: הוספה ל-`data/recipes.json`. הערכים התזונתיים מחושבים אוטומטית מהרכיבים.
- השוואות ורשימות: `COMPARE_PAIRS` ו-`LISTS` ב-`lib/data.ts`.
- כתובת האתר הקנונית: משתנה סביבה `NEXT_PUBLIC_SITE_URL`.
