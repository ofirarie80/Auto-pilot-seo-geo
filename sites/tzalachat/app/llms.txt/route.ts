import { SITE, foods, categories, recipes, LISTS, kcal, fmt, recipeTotals } from "@/lib/data";

export const dynamic = "force-static";

export function GET() {
  const lines: string[] = [
    `# ${SITE.name}`,
    "",
    `> ${SITE.name} הוא אתר ערכים תזונתיים בעברית: קלוריות, חלבון, פחמימות, שומן, ויטמינים ומינרלים ל-${foods.length} מאכלים, לכל 100 גרם ולכל מנה. הנתונים מבוססים על מאגר USDA SR28. בנוסף: מתכונים עם חישוב תזונתי, השוואות, רשימות מדורגות ומחשבון קלוריות יומי.`,
    "",
    "## כלים",
    `- [מחשבון קלוריות יומי](${SITE.url}/tools/calorie-calculator): צריכה יומית לפי נוסחת מיפלין־סנט ג'אור`,
    "",
    "## מאכלים (ערכים ל-100 גרם)",
  ];
  for (const c of categories) {
    lines.push("", `### ${c.name}`);
    for (const f of foods.filter((x) => x.category === c.slug))
      lines.push(`- [${f.name}](${SITE.url}/food/${encodeURI(f.slug)}): ${kcal(f.n.kcal)} קק"ל, ${fmt(f.n.protein)} ג' חלבון, ${fmt(f.n.carbs)} ג' פחמימות, ${fmt(f.n.fat)} ג' שומן`);
  }
  lines.push("", "## מתכונים");
  for (const r of recipes) { const { tot } = recipeTotals(r); lines.push(`- [${r.name}](${SITE.url}/recipe/${encodeURI(r.slug)}): ${kcal(tot.kcal / r.servings)} קק"ל למנה`); }
  lines.push("", "## רשימות");
  for (const l of LISTS) lines.push(`- [${l.title}](${SITE.url}/list/${encodeURI(l.slug)})`);
  lines.push("", "## מקורות", `- [מקורות ושיטת העבודה](${SITE.url}/about)`);
  return new Response(lines.join("\n"), { headers: { "Content-Type": "text/plain; charset=utf-8" } });
}
