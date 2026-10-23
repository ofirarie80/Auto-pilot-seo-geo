import foodsData from "@/data/foods.json";
import recipesData from "@/data/recipes.json";

export const SITE = {
  name: "צלחת",
  tagline: "כמה קלוריות, חלבון ופחמימות יש בכל מה שעל הצלחת",
  url: process.env.NEXT_PUBLIC_SITE_URL || "https://tzalachat.vercel.app",
  /** Search engines may index the site only when NEXT_PUBLIC_INDEXABLE is exactly "true". */
  indexable: process.env.NEXT_PUBLIC_INDEXABLE === "true",
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
  ingredients: Ingredient[]; steps: string[]; tags: string[]; category?: string;
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

/** Per-category tint used for tiles and page headers. */
export const CAT_TINT: Record<string, string> = {
  fruits: "#ffe1d6", vegetables: "#dff1d3", bread: "#f6e7c8", grains: "#f3ecd2", dairy: "#e3ecf7",
  meat: "#f6d9d9", fish: "#d6ecef", legumes: "#ece3d0", nuts: "#efe0cc", fats: "#eef0c9",
  sweets: "#f5dcea", drinks: "#dde6fb", dishes: "#f3e0cf", herbs: "#dcefdc",
};

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

/** Attach the preposition ב to a label, with a hyphen before digits/Latin ("ב-10 ענבים", "ב-L"). */
export const inL = (s: string) => (/^[0-9A-Za-z]/.test(s) ? `ב-${s}` : `ב${s}`);

/** Nutrient registry: Hebrew label, unit, and FDA daily value (2,000 kcal reference diet). */
export const NUTRIENTS: Record<string, { label: string; unit: string; dv?: number; inLabel?: string }> = {
  kcal: { label: "אנרגיה", unit: "קק\"ל" },
  protein: { label: "חלבון", unit: "גרם", dv: 50, inLabel: "בחלבון" },
  carbs: { label: "פחמימות", unit: "גרם", dv: 275, inLabel: "בפחמימות" },
  sugar: { label: "מתוכן סוכרים", unit: "גרם" },
  fiber: { label: "סיבים תזונתיים", unit: "גרם", dv: 28, inLabel: "בסיבים תזונתיים" },
  fat: { label: "שומנים", unit: "גרם", dv: 78, inLabel: "בשומן" },
  satFat: { label: "מתוכם רוויים", unit: "גרם", dv: 20 },
  monoFat: { label: "חד בלתי רוויים", unit: "גרם" },
  polyFat: { label: "רב בלתי רוויים", unit: "גרם" },
  cholesterol: { label: "כולסטרול", unit: "מ\"ג", dv: 300 },
  sodium: { label: "נתרן", unit: "מ\"ג", dv: 2300, inLabel: "בנתרן" },
  potassium: { label: "אשלגן", unit: "מ\"ג", dv: 4700, inLabel: "באשלגן" },
  calcium: { label: "סידן", unit: "מ\"ג", dv: 1300, inLabel: "בסידן" },
  iron: { label: "ברזל", unit: "מ\"ג", dv: 18, inLabel: "בברזל" },
  magnesium: { label: "מגנזיום", unit: "מ\"ג", dv: 420, inLabel: "במגנזיום" },
  phosphorus: { label: "זרחן", unit: "מ\"ג", dv: 1250 },
  zinc: { label: "אבץ", unit: "מ\"ג", dv: 11, inLabel: "באבץ" },
  vitA_RAE: { label: "ויטמין A", unit: "מק\"ג", dv: 900, inLabel: "בוויטמין A" },
  vitC: { label: "ויטמין C", unit: "מ\"ג", dv: 90, inLabel: "בוויטמין C" },
  vitD_mcg: { label: "ויטמין D", unit: "מק\"ג", dv: 20 },
  vitE: { label: "ויטמין E", unit: "מ\"ג", dv: 15 },
  vitK: { label: "ויטמין K", unit: "מק\"ג", dv: 120, inLabel: "בוויטמין K" },
  thiamin: { label: "ויטמין B1 (תיאמין)", unit: "מ\"ג", dv: 1.2 },
  riboflavin: { label: "ויטמין B2 (ריבופלבין)", unit: "מ\"ג", dv: 1.3 },
  niacin: { label: "ויטמין B3 (ניאצין)", unit: "מ\"ג", dv: 16 },
  vitB6: { label: "ויטמין B6", unit: "מ\"ג", dv: 1.7 },
  folateDFE: { label: "חומצה פולית (פולאט)", unit: "מק\"ג", dv: 400, inLabel: "בחומצה פולית" },
  vitB12: { label: "ויטמין B12", unit: "מק\"ג", dv: 2.4, inLabel: "בוויטמין B12" },
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

/**
 * Descriptive badges per 100 g. "High" thresholds for sugar, fat, saturated fat and salt follow the
 * UK Food Standards Agency front-of-pack traffic-light criteria; the rest are simple, stated cut-offs.
 */
export type Badge = { label: string; tone: "good" | "warn" | "info"; why: string };
export function badges(f: Food): Badge[] {
  const n = f.n; const b: Badge[] = [];
  const isDrink = f.category === "drinks";
  if ((n.protein ?? 0) >= 15) b.push({ label: "עשיר בחלבון", tone: "good", why: "15 גרם חלבון ומעלה ב-100 גרם" });
  if ((n.fiber ?? 0) >= 6) b.push({ label: "עשיר בסיבים", tone: "good", why: "6 גרם סיבים ומעלה ב-100 גרם" });
  if ((n.kcal ?? 999) <= (isDrink ? 20 : 40)) b.push({ label: "דל קלוריות", tone: "good", why: isDrink ? "עד 20 קלוריות ב-100 מ\"ל" : "עד 40 קלוריות ב-100 גרם" });
  if ((n.vitC ?? 0) >= 18) b.push({ label: "מקור לוויטמין C", tone: "info", why: "20% ומעלה מהערך היומי ב-100 גרם" });
  if ((n.calcium ?? 0) >= 260) b.push({ label: "מקור לסידן", tone: "info", why: "20% ומעלה מהערך היומי ב-100 גרם" });
  if ((n.iron ?? 0) >= 3.6) b.push({ label: "מקור לברזל", tone: "info", why: "20% ומעלה מהערך היומי ב-100 גרם" });
  if ((n.sugar ?? 0) > (isDrink ? 11.25 : 22.5)) b.push({ label: "עתיר סוכר", tone: "warn", why: "מעל סף 'גבוה' ברמזור התזונתי הבריטי" });
  if ((n.fat ?? 0) > (isDrink ? 8.75 : 17.5)) b.push({ label: "עתיר שומן", tone: "warn", why: "מעל סף 'גבוה' ברמזור התזונתי הבריטי" });
  if ((n.satFat ?? 0) > (isDrink ? 2.5 : 5)) b.push({ label: "עתיר שומן רווי", tone: "warn", why: "מעל סף 'גבוה' ברמזור התזונתי הבריטי" });
  if ((n.sodium ?? 0) > (isDrink ? 300 : 600)) b.push({ label: "עתיר נתרן", tone: "warn", why: "מעל סף 'גבוה' ברמזור התזונתי הבריטי" });
  return b;
}

/** Minutes of activity to burn `kcal`, for a 70 kg adult. MET values from the Compendium of Physical Activities. */
export const ACTIVITIES = [
  { slug: "walking", label: "הליכה רגילה", met: 3.5 },
  { slug: "brisk", label: "הליכה מהירה", met: 5.0 },
  { slug: "running", label: "ריצה קלה", met: 8.3 },
  { slug: "cycling", label: "רכיבה על אופניים", met: 8.0 },
  { slug: "swimming", label: "שחייה", met: 5.8 },
];
export const burnMinutes = (kcalAmount: number, met: number, kg = 70) => kcalAmount / ((met * 3.5 * kg) / 200);

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
const CURATED_PAIRS: [string, string][] = [
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
  ["חמאה", "מרגרינה"], ["שמן-זית", "שמן-קוקוס"], ["סוכר", "סוכר-חום"], ["דבש", "סירופ-מייפל"],
  ["קולה", "קולה-זירו"], ["יין-אדום", "יין-לבן"], ["בירה", "בירה-לייט"],
  ["חזה-עוף", "הודו-צלוי"], ["חזה-עוף", "סלמון"], ["סטייק", "חזה-עוף"], ["בשר-טחון", "הודו-טחון"],
  ["טונה-במים", "סלמון"], ["ביצה", "טופו"], ["עדשים", "גרגרי-חומוס"], ["קינואה", "כוסמת"],
  ["שיבולת-שועל", "גרנולה"], ["קורנפלקס", "גרנולה"], ["פופקורן", "ציפס-שקית"], ["בייגלה", "ציפס-שקית"],
  ["גלידה", "פרוזן-יוגורט"], ["שמנת-חמוצה", "יוגורט-יווני"], ["ריקוטה", "קוטג"], ["פטה", "גבינה-צהובה"],
  ["אבוקדו", "חמאה"], ["תמר", "תמר-דקל-נור"], ["צימוקים", "ענבים"], ["משמש", "משמש-מיובש"],
  ["תפוח-אדמה", "פירה"], ["ציפס", "תפוח-אדמה-אפוי"], ["באגט", "לחם-מלא"], ["חלה", "לחם-לבן"],
];
/** Auto pairs: the first six foods of each category (curated order ≈ popularity), each against each. */
function autoPairs(): [string, string][] {
  const out: [string, string][] = [];
  for (const c of categories) {
    if (c.slug === "herbs") continue;
    const top = foodsIn(c.slug).slice(0, 6).map((f) => f.slug);
    for (let i = 0; i < top.length; i++) for (let j = i + 1; j < top.length; j++) out.push([top[i], top[j]]);
  }
  return out;
}
const pairKey = (a: string, b: string) => [a, b].sort().join("|");
export const COMPARE_PAIRS: [string, string][] = (() => {
  const seen = new Set<string>(); const out: [string, string][] = [];
  for (const p of [...CURATED_PAIRS, ...autoPairs()]) {
    if (!bySlug.has(p[0]) || !bySlug.has(p[1])) continue;
    const k = pairKey(p[0], p[1]); if (seen.has(k)) continue;
    seen.add(k); out.push(p);
  }
  return out;
})();
export const pairSlug = (a: string, b: string) => `${a}-מול-${b}`;
const pairIndex = new Map(COMPARE_PAIRS.map(([a, b]) => [pairSlug(a, b), [a, b] as [string, string]]));
export function parsePair(slug: string): [Food, Food] | null {
  const p = pairIndex.get(dec(slug)); if (!p) return null;
  const fa = getFood(p[0]), fb = getFood(p[1]);
  return fa && fb ? [fa, fb] : null;
}
export const pairsFor = (slug: string) => COMPARE_PAIRS.filter(([a, b]) => a === slug || b === slug);

/* ---------- Ranked lists ---------- */
export type ListDef = { slug: string; title: string; h1: string; key: string; dir: "desc" | "asc"; cats?: string[]; exclude?: string[]; intro: string };
const BASE_LISTS: ListDef[] = [
  { slug: "מזונות-עשירים-בחלבון", title: "מזונות עשירים בחלבון", h1: "המזונות העשירים ביותר בחלבון", key: "protein", dir: "desc", exclude: ["ג'לטין", "גלטין"], intro: "דירוג לפי גרם חלבון ב-100 גרם מזון. שימו לב לגודל המנה: חופן שקדים שוקל כ-28 גרם, ואילו מנת עוף יכולה לשקול 150 גרם." },
  { slug: "מזונות-עשירים-בסיבים", title: "מזונות עשירים בסיבים תזונתיים", h1: "המזונות העשירים ביותר בסיבים תזונתיים", key: "fiber", dir: "desc", intro: "דירוג לפי גרם סיבים ב-100 גרם. הערך היומי המומלץ הוא 28 גרם." },
  { slug: "מזונות-עשירים-בברזל", title: "מזונות עשירים בברזל", h1: "המזונות העשירים ביותר בברזל", key: "iron", dir: "desc", intro: "דירוג לפי מיליגרם ברזל ב-100 גרם. ברזל ממקור צמחי נספג בגוף פחות טוב מברזל ממקור מן החי, וויטמין C משפר את הספיגה." },
  { slug: "מזונות-עשירים-בסידן", title: "מזונות עשירים בסידן", h1: "המזונות העשירים ביותר בסידן", key: "calcium", dir: "desc", intro: "דירוג לפי מיליגרם סידן ב-100 גרם." },
  { slug: "מזונות-עשירים-באשלגן", title: "מזונות עשירים באשלגן", h1: "המזונות העשירים ביותר באשלגן", key: "potassium", dir: "desc", intro: "דירוג לפי מיליגרם אשלגן ב-100 גרם." },
  { slug: "מזונות-עשירים-בויטמין-c", title: "מזונות עשירים בוויטמין C", h1: "המזונות העשירים ביותר בוויטמין C", key: "vitC", dir: "desc", intro: "דירוג לפי מיליגרם ויטמין C ב-100 גרם." },
  { slug: "מזונות-עשירים-במגנזיום", title: "מזונות עשירים במגנזיום", h1: "המזונות העשירים ביותר במגנזיום", key: "magnesium", dir: "desc", intro: "דירוג לפי מיליגרם מגנזיום ב-100 גרם." },
  { slug: "מזונות-עשירים-בויטמין-b12", title: "מזונות עשירים בוויטמין B12", h1: "המזונות העשירים ביותר בוויטמין B12", key: "vitB12", dir: "desc", intro: "דירוג לפי מיקרוגרם ויטמין B12 ב-100 גרם. ויטמין B12 נמצא כמעט רק במזון מן החי." },
  { slug: "מזונות-עשירים-באבץ", title: "מזונות עשירים באבץ", h1: "המזונות העשירים ביותר באבץ", key: "zinc", dir: "desc", intro: "דירוג לפי מיליגרם אבץ ב-100 גרם." },
  { slug: "מזונות-עשירים-בחומצה-פולית", title: "מזונות עשירים בחומצה פולית", h1: "המזונות העשירים ביותר בחומצה פולית", key: "folateDFE", dir: "desc", intro: "דירוג לפי מיקרוגרם פולאט ב-100 גרם." },
  { slug: "מזונות-דלים-בנתרן", title: "מזונות דלים בנתרן", h1: "מזונות דלים בנתרן", key: "sodium", dir: "asc", cats: ["fruits", "vegetables", "grains", "legumes", "nuts", "fish", "meat"], intro: "מזונות בסיסיים מדורגים לפי מיליגרם נתרן ב-100 גרם, מהנמוך לגבוה." },
  { slug: "פירות-דלים-בקלוריות", title: "פירות דלים בקלוריות", h1: "הפירות הדלים ביותר בקלוריות", key: "kcal", dir: "asc", cats: ["fruits"], intro: "פירות מדורגים לפי קלוריות ב-100 גרם, מהנמוך לגבוה." },
  { slug: "ירקות-דלים-בקלוריות", title: "ירקות דלים בקלוריות", h1: "הירקות הדלים ביותר בקלוריות", key: "kcal", dir: "asc", cats: ["vegetables"], intro: "ירקות מדורגים לפי קלוריות ב-100 גרם, מהנמוך לגבוה." },
  { slug: "מזונות-דלים-בפחמימות", title: "מזונות דלים בפחמימות", h1: "מזונות דלים בפחמימות", key: "carbs", dir: "asc", cats: ["meat", "fish", "dairy", "vegetables", "nuts"], intro: "בשר, דגים, מוצרי חלב, ירקות ואגוזים, מדורגים לפי גרם פחמימות ב-100 גרם." },
  { slug: "מזונות-עשירים-בקלוריות", title: "מזונות עשירים בקלוריות", h1: "המזונות העתירים ביותר בקלוריות", key: "kcal", dir: "desc", exclude: [], intro: "מזונות מדורגים לפי קלוריות ב-100 גרם. רוב הרשימה שמנים, אגוזים ומתוקים, שבהם גם כמות קטנה מוסיפה הרבה אנרגיה." },
];
/** Category × nutrient lists, generated for categories with enough foods. */
const CAT_NUTRIENTS = ["protein", "fiber", "iron", "calcium", "potassium", "vitC", "magnesium"];
const SKIP_CATS = new Set(["herbs", "drinks", "fats", "dishes", "sweets"]);
/** Plural label and the matching gender of "rich in" for list titles. */
const CAT_PLURAL: Record<string, [string, string]> = {
  fruits: ["פירות", "עשירים"], vegetables: ["ירקות", "עשירים"], bread: ["לחמים ומאפים", "עשירים"],
  grains: ["דגנים", "עשירים"], dairy: ["מוצרי חלב", "עשירים"], meat: ["סוגי בשר ועוף", "עשירים"],
  fish: ["דגים ופירות ים", "עשירים"], legumes: ["קטניות", "עשירות"], nuts: ["אגוזים וזרעים", "עשירים"],
};
function catLists(): ListDef[] {
  const out: ListDef[] = [];
  for (const c of categories) {
    if (SKIP_CATS.has(c.slug)) continue;
    const items = foodsIn(c.slug);
    if (items.length < 8) continue;
    for (const k of CAT_NUTRIENTS) {
      const vals = items.map((f) => f.n[k] ?? 0).sort((a, b) => b - a);
      const dv = NUTRIENTS[k].dv!;
      if (vals[2] < dv * 0.05) continue; // not a meaningful source in this category
      const [label, rich] = CAT_PLURAL[c.slug] ?? [c.name, "עשירים"];
      out.push({
        slug: `${c.slug}-${k}`, key: k, dir: "desc", cats: [c.slug],
        title: `${label} ${rich} ${NUTRIENTS[k].inLabel}`,
        h1: `${label} ${rich} ${NUTRIENTS[k].inLabel}: דירוג`,
        intro: `${items.length} מאכלים מהקטגוריה ${c.name}, מדורגים לפי ${NUTRIENTS[k].label} ב-100 גרם, מהגבוה לנמוך.`,
      });
    }
  }
  return out;
}
export const LISTS: ListDef[] = [...BASE_LISTS, ...catLists()];
export const getList = (slug: string) => LISTS.find((l) => l.slug === dec(slug));
export function rankList(l: ListDef, limit = 25) {
  return foods
    .filter((f) => (!l.cats || l.cats.includes(f.category)) && !(l.exclude || []).includes(f.slug) && f.n[l.key] != null)
    .filter((f) => !(l.key === "kcal" && l.dir === "asc" && f.category === "drinks"))
    .filter((f) => f.category !== "herbs" || l.cats?.includes("herbs"))
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
