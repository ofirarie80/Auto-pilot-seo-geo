import { foodImage } from "@/lib/foodImages";

/** Both styles are rendered; the page-level switch (data-img on <html>) shows one. Demo only until a style is chosen. */
export default function FoodImage({ slug, alt, className, eager }: { slug: string; alt: string; className?: string; eager?: boolean }) {
  const photo = foodImage(slug, "photo");
  if (!photo) return null;
  const ill = foodImage(slug, "illustration")!;
  const cut = foodImage(slug, "cutout") || ill;
  return (
    <span className={`food-img ${className || ""}`}>
      <img className="v-photo" src={photo} alt={alt} width={1024} height={1024} loading={eager ? "eager" : "lazy"} decoding="async" />
      <img className="v-ill" src={ill} alt={alt} width={1024} height={1024} loading="lazy" decoding="async" />
      <img className={`v-cut${cut === ill ? " fallback" : ""}`} src={cut} alt={alt} width={1024} height={1024} loading="lazy" decoding="async" />
    </span>
  );
}
