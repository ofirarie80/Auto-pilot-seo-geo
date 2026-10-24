/** Foods that already have generated images (both styles). Replaced by a generated manifest once images are produced in bulk. */
const BLOB = "https://14oqrvf8z54bncjn.public.blob.vercel-storage.com";
export const IMAGED = new Set(["מאפין-אנגלי", "בננה", "חזה-עוף", "פיתה", "חומוס", "אבוקדו", "קוטג", "תמר", "סלמון", "ביצה"]);
export const CUTOUT = new Set(["בננה", "אבוקדו", "פיתה", "סלמון", "ביצה", "חומוס"]);
export const foodImage = (slug: string, style: "photo" | "illustration" | "cutout" = "photo") =>
  style === "cutout" ? (CUTOUT.has(slug) ? `${BLOB}/foods/cutout/${encodeURIComponent(slug)}.webp` : null) :
  IMAGED.has(slug) ? `${BLOB}/foods/${style}/${encodeURIComponent(slug)}.webp` : null;
