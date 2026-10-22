import foodsData from "@/data/foods.json";
import recipesData from "@/data/recipes.json";

export const SITE = {
  name: "צלחת",
  tagline: "כמה קלוריות, חלבון ופחמימות יש בכל מה שעל הצלחת",
  url: process.env.NEXT_PUBLIC_SITE_URL || "https://tzalachat.vercel.app",
};

export type Nutrients = Record<string, number | null>;
export type Serving = { label: string; g: number };
export type Food = {
  slug: string; name: string; ndb: string; usda: string; category: string;
  servings: Serving[]; aliases: string[]; n: Nutrients;
};
export type Category = { slug: string; name: string; emoji: string };
export type Ingredient = { food: string; g: number; label: string };
export type Recipe = {
  slug: string; name: string; intro: string; servings: number; time: number;
  ingredients: Ingredient[]; steps: string[]; tags: string[];
};

export const foods = foodsData.foods as Food[];
export const categories = foodsData.categories as Category[];
export const recipes = recipesData.recipes as Recipe[];

const bySlug = new Map(foods.map((f) => [f.slug, f]));
export const dec = (s: string) => { try { return decodeURIComponent(s); } catch { return s; } };
export const getFood = (slug: string) => bySlug.get(dec(slug));
export const getCategory = (slug: string) => categories.find((c) => c.slug === dec(slug));
export const getRecipe = (slug: string) => recipes.find((r) => r.slug === dec(slug));
export const foodsIn = (cat: string) => foods.filter((f) => f.category === cat);

/** Name without parenthetical qualifier, for use in questions: "חזה עוף (צלוי)" -> "חזה עוף" */
export const shortName = (name: string) => name.replace(/\s*\(.*?\)\s*/g, " ").trim();

export const scale = (v: number | null | undefined, g: number) => (v == null ? null : (v * g) / 100);

export function fmt(v: number | null | undefined, digits = 1): string {
  if (v == null) return "—";
  if (v === 0) return "0";
  if (Math.abs(v) >= 100) return Math.round(v).toLocaleString("he-IL");
  const r = Number(v.toFixed(digits));
  return r === 0 ? "פחות מ-0.1" : r.toLocaleString("he-IL");
}
export const kcal = (v: number | null | undefined) => (v == null ? "—" : Math.round(v).toLocaleString("he-IL"));

/** Nutrient registry: Hebrew label, unit, and FDA daily value (2,000 kcal reference diet). */
export const NUTRIENTS: Record<string, { label: string; unit: string; dv?: number }> = {
  kcal: { label: "אנרגיה", unit: "קק\"ל" },
  protein: { label: "חלבון", unit: "גרם", dv: 50 },
  carbs: { label: "פחמימות", unit: "גרם", dv: 275 },
  sugar: { label: "מתוכן סוכרים", unit: "גרם" },
  fiber: { label: "סיבים תזונתיים", unit: "גרם", dv: 28 },
  fat: { label: "שומנים", unit: "גרם", dv: 78 },
  satFat: { label: "מתוכם רוויים", unit: "גרם", dv: 20 },
  monoFat: { label: "חד בלתי רוויים", unit: "גרם" },
  polyFat: { label: "רב בלתי רוויים", unit: "גרם" },
  cholesterol: { label: "כולסטרול", unit: "מ\"ג", dv: 300 },
  sodium: { label: "נתרן", unit: "מ\"ג", dv: 2300 },
  potassium: { label: "אשלגן", unit: "מ\"ג", dv: 4700 },
  calcium: { label: "סידן", unit: "מ\"ג", dv: 1300 },
  iron: { label: "ברזל", unit: "מ\"ג", dv: 18 },
  magnesium: { label: "מגנזיום", unit: "מ\"ג", dv: 420 },
  phosphorus: { label: "זרחן", unit: "מ\"ג", dv: 1250 },
  zinc: { label: "אבץ", unit: "מ\"ג", dv: 11 },
  vitA_RAE: { label: "ויטמין A", unit: "מק\"ג", dv: 900 },
  vitC: { label: "ויטמין C", unit: "מ\"ג", dv: 90 },
  vitD_mcg: { label: "ויטמין D", unit: "מק\"ג", dv: 20 },
  vitE: { label: "ויטמין E", unit: "מ\"ג", dv: 15 },
  vitK: { label: "ויטמין K", unit: "מק\"ג", dv: 120 },
  thiamin: { label: "ויטמין B1 (תיאמין)", unit: "מ\"ג", dv: 1.2 },
  riboflavin: { label: "ויטמין B2 (ריבופלבין)", unit: "מ\"ג", dv: 1.3 },
  niacin: { label: "ויטמין B3 (ניאצין)", unit: "מ\"ג", dv: 16 },
  vitB6: { label: "ויטמין B6", unit: "מ\"ג", dv: 1.7 },
  folateDFE: { label: "חומצה פולית (פולאט)", unit: "מק\"ג", dv: 400 },
  vitB12: { label: "ויטמין B12", unit: "מק\"ג", dv: 2.4 },
  water: { label: "מים", unit: "גרם" },
};

export const pctDV = (key: string, v: number | null) => {
  const dv = NUTRIENTS[key]?.dv;
  return dv && v != null ? Math.round((v / dv) * 100) : null;
};

/** Share of calories from each macronutrient (4/4/9 kcal per gram). */
export function macroSplit(n: Nutrients) {
  const p = (n.protein ?? 0) * 4, c = (n.carbs ?? 0) * 4, f = (n.fat ?? 0) * 9;
  const t = p + c + f;
  if (t === 0) return { protein: 0, carbs: 0, fat: 0 };
  return { protein: (p / t) * 100, carbs: (c / t) * 100, fat: (f / t) * 100 };
}

/** Sum nutrients across ingredients (grams), returning totals for the whole recipe. */
export function recipeTotals(r: Recipe) {
  const keys = Object.keys(NUTRIENTS);
  const tot: Record<string, number> = Object.fromEntries(keys.map((k) => [k, 0]));
  let grams = 0;
  for (const ing of r.ingredients) {
    const f = getFood(ing.food);
    if (!f) throw new Error(`Recipe ${r.slug}: unknown food ${ing.food}`);
    grams += ing.g;
    for (const k of keys) tot[k] += ((f.n[k] ?? 0) * ing.g) / 100;
  }
  return { tot, grams };
}

/* ---------- Comparisons ---------- */
export const COMPARE_PAIRS: [string, string][] = [
  ["פיתה", "לחם-לבן"], ["פיתה", "פיתה-מלאה"], ["לחם-לבן", "לחם-מלא"], ["פיתה", "טורטיה"],
  ["אורז-לבן", "אורז-מלא"], ["אורז-לבן", "קינואה"], ["אורז-לבן", "בורגול"], ["קוסקוס", "אורז-לבן"],
  ["פסטה", "פסטה-מלאה"], ["פסטה", "אורז-לבן"], ["תפוח-אדמה", "בטטה"],
  ["חלב", "חלב-שקדים"], ["חלב", "חלב-סויה"], ["חלב", "חלב-1"], ["יוגורט", "יוגורט-יווני"],
  ["ביצה", "חלבון-ביצה"], ["קוטג", "גבינה-צהובה"],
  ["חזה-עוף", "פרגית"], ["טונה-במים", "טונה-בשמן"], ["סלמון", "אמנון"], ["חזה-עוף", "טופו"],
  ["בננה", "תפוח"], ["תמר", "בננה"], ["ענבים", "תות-שדה"], ["אבטיח", "מלון"],
  ["שקדים", "אגוזי-מלך"], ["בוטנים", "שקדים"], ["חומוס", "טחינה"], ["פלאפל", "חומוס"],
  ["חמאה", "שמן-זית"], ["שמן-זית", "שמן-קנולה"], ["דבש", "סוכר"],
  ["שוקולד-מריר", "שוקולד-חלב"], ["קולה", "מיץ-תפוזים"], ["בירה", "יין-אדום"],
];
export const pairSlug = (a: string, b: string) => `${a}-מול-${b}`;
export function parsePair(slug: string): [Food, Food] | null {
  const s = dec(slug);
  for (const [a, b] of COMPARE_PAIRS) if (pairSlug(a, b) === s) {
    const fa = getFood(a), fb = getFood(b);
    return fa && fb ? [fa, fb] : null;
  }
  return null;
}
export const pairsFor = (slug: string) => COMPARE_PAIRS.filter(([a, b]) => a === slug || b === slug);

/* ---------- Ranked lists ---------- */
export type ListDef = { slug: string; title: string; h1: string; key: string; dir: "desc" | "asc"; cats?: string[]; exclude?: string[]; intro: string };
export const LISTS: ListDef[] = [
  { slug: "מזונות-עשירים-בחלבון", title: "מזונות עשירים בחלבון", h1: "המזונות העשירים ביותר בחלבון", key: "protein", dir: "desc", intro: "דירוג לפי גרם חלבון ב-100 גרם מזון. שימו לב לגודל המנה: חופן שקדים שוקל כ-28 גרם, ואילו מנת עוף יכולה לשקול 150 גרם." },
  { slug: "מזונות-עשירים-בסיבים", title: "מזונות עשירים בסיבים תזונתיים", h1: "המזונות העשירים ביותר בסיבים תזונתיים", key: "fiber", dir: "desc", intro: "דירוג לפי גרם סיבים ב-100 גרם. הערך היומי המומלץ הוא 28 גרם." },
  { slug: "מזונות-עשירים-בברזל", title: "מזונות עשירים בברזל", h1: "המזונות העשירים ביותר בברזל", key: "iron", dir: "desc", intro: "דירוג לפי מיליגרם ברזל ב-100 גרם. ברזל ממקור צמחי נספג בגוף פחות טוב מברזל ממקור מן החי, וויטמין C משפר את הספיגה." },
  { slug: "מזונות-עשירים-בסידן", title: "מזונות עשירים בסידן", h1: "המזונות העשירים ביותר בסידן", key: "calcium", dir: "desc", intro: "דירוג לפי מיליגרם סידן ב-100 גרם." },
  { slug: "מזונות-עשירים-באשלגן", title: "מזונות עשירים באשלגן", h1: "המזונות העשירים ביותר באשלגן", key: "potassium", dir: "desc", intro: "דירוג לפי מיליגרם אשלגן ב-100 גרם." },
  { slug: "מזונות-עשירים-בויטמין-c", title: "מזונות עשירים בוויטמין C", h1: "המזונות העשירים ביותר בוויטמין C", key: "vitC", dir: "desc", intro: "דירוג לפי מיליגרם ויטמין C ב-100 גרם." },
  { slug: "מזונות-עשירים-במגנזיום", title: "מזונות עשירים במגנזיום", h1: "המזונות העשירים ביותר במגנזיום", key: "magnesium", dir: "desc", intro: "דירוג לפי מיליגרם מגנזיום ב-100 גרם." },
  { slug: "פירות-דלים-בקלוריות", title: "פירות דלים בקלוריות", h1: "הפירות הדלים ביותר בקלוריות", key: "kcal", dir: "asc", cats: ["fruits"], exclude: ["צימוקים"], intro: "פירות טריים מדורגים לפי קלוריות ב-100 גרם, מהנמוך לגבוה." },
  { slug: "ירקות-דלים-בקלוריות", title: "ירקות דלים בקלוריות", h1: "הירקות הדלים ביותר בקלוריות", key: "kcal", dir: "asc", cats: ["vegetables"], intro: "ירקות מדורגים לפי קלוריות ב-100 גרם, מהנמוך לגבוה." },
  { slug: "מזונות-דלים-בפחמימות", title: "מזונות דלים בפחמימות", h1: "מזונות דלים בפחמימות", key: "carbs", dir: "asc", exclude: [], cats: ["meat", "fish", "dairy", "vegetables", "nuts"], intro: "בשר, דגים, מוצרי חלב, ירקות ואגוזים, מדורגים לפי גרם פחמימות ב-100 גרם." },
];
export const getList = (slug: string) => LISTS.find((l) => l.slug === dec(slug));
export function rankList(l: ListDef, limit = 25) {
  return foods
    .filter((f) => (!l.cats || l.cats.includes(f.category)) && !(l.exclude || []).includes(f.slug) && f.n[l.key] != null)
    .filter((f) => f.category !== "drinks" || l.key !== "kcal")
    .sort((a, b) => (l.dir === "desc" ? (b.n[l.key]! - a.n[l.key]!) : (a.n[l.key]! - b.n[l.key]!)))
    .slice(0, limit);
}

/** Same-category neighbours closest in calories, for "related" links. */
export function related(f: Food, k = 6) {
  return foodsIn(f.category).filter((x) => x.slug !== f.slug)
    .sort((a, b) => Math.abs((a.n.kcal ?? 0) - (f.n.kcal ?? 0)) - Math.abs((b.n.kcal ?? 0) - (f.n.kcal ?? 0)))
    .slice(0, k);
}

export const POPULAR = ["פיתה", "ביצה", "בננה", "חזה-עוף", "אבוקדו", "תמר", "חומוס", "אורז-לבן", "תפוח", "ענבים", "טחינה", "שקדים"];

/** Attach the preposition ב to a label, with a hyphen before digits/Latin ("ב-10 ענבים", "ב-L"). */
export const inL = (s: string) => (/^[0-9A-Za-z]/.test(s) ? `ב-${s}` : `ב${s}`);
