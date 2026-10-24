import manifest from "@/data/food-images.json";

/** Food illustrations (transparent background), generated per food and listed at build time. */
const MAP = manifest as Record<string, string>;
export const hasImage = (slug: string) => slug in MAP;
export const foodImage = (slug: string) => MAP[slug] ?? null;
export const imageCount = () => Object.keys(MAP).length;
