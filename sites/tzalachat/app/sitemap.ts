import type { MetadataRoute } from "next";
import { SITE, foods, categories, recipes, COMPARE_PAIRS, pairSlug, LISTS } from "@/lib/data";

export default function sitemap(): MetadataRoute.Sitemap {
  const u = (p: string, priority: number) => ({ url: `${SITE.url}${encodeURI(p)}`, lastModified: new Date(), priority });
  return [
    u("/", 1), u("/tools/calorie-calculator", 0.9), u("/category", 0.8), u("/recipe", 0.8), u("/compare", 0.7), u("/about", 0.4),
    ...categories.map((c) => u(`/category/${c.slug}`, 0.8)),
    ...foods.map((f) => u(`/food/${f.slug}`, 0.8)),
    ...recipes.map((r) => u(`/recipe/${r.slug}`, 0.7)),
    ...COMPARE_PAIRS.map(([a, b]) => u(`/compare/${pairSlug(a, b)}`, 0.6)),
    ...LISTS.map((l) => u(`/list/${l.slug}`, 0.7)),
  ];
}
