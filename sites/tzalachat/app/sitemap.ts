import type { MetadataRoute } from "next";
import { SITE, foods, categories, recipes, COMPARE_PAIRS, pairSlug, LISTS } from "@/lib/data";
import { foodImage } from "@/lib/foodImages";

export default function sitemap(): MetadataRoute.Sitemap {
  const u = (p: string, priority: number) => ({ url: `${SITE.url}${encodeURI(p)}`, lastModified: new Date(), priority });
  return [
    u("/", 1), u("/tools", 0.8), u("/tools/calorie-calculator", 0.9), u("/tools/bmi", 0.9), u("/tools/protein-calculator", 0.9),
    u("/category", 0.8), u("/recipe", 0.8), u("/compare", 0.7), u("/list", 0.7), u("/about", 0.4),
    ...categories.map((c) => u(`/category/${c.slug}`, 0.8)),
    ...foods.map((f) => { const img = foodImage(f.slug); return { ...u(`/food/${f.slug}`, 0.8), ...(img ? { images: [img] } : {}) }; }),
    ...recipes.map((r) => u(`/recipe/${r.slug}`, 0.7)),
    ...COMPARE_PAIRS.map(([a, b]) => u(`/compare/${pairSlug(a, b)}`, 0.6)),
    ...LISTS.map((l) => u(`/list/${l.slug}`, 0.7)),
  ];
}
