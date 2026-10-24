import { foodImage } from "@/lib/foodImages";

/** Transparent-background food illustration. Renders nothing when the food has no image yet. */
export default function FoodImage({ slug, alt, className, eager }: { slug: string; alt: string; className?: string; eager?: boolean }) {
  const src = foodImage(slug);
  if (!src) return null;
  return (
    <span className={`food-img ${className || ""}`}>
      <img src={src} alt={alt} width={1024} height={1024} loading={eager ? "eager" : "lazy"} decoding="async" fetchPriority={eager ? "high" : "auto"} />
    </span>
  );
}
