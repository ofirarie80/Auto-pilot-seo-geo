/** Image styles for food photos. One library serves the site and, later, the app. */
export const IMAGE_STYLES = {
  photo:
    "Professional studio food photograph of {food}. One natural serving, centered, on a plain warm off-white surface " +
    "(#fbfaf6) with a matching seamless background. Soft diffused daylight from the left, gentle shadow, 45-degree " +
    "camera angle, shallow depth of field. Realistic, appetizing, true to how the food looks in Israel. Minimal or no " +
    "props, no hands, no text, no labels, no logos, no brand packaging.",
  illustration:
    "Clean modern editorial illustration of {food}. Simple flat shapes with soft gradients and a subtle shadow, " +
    "centered on a plain warm off-white background (#fbfaf6). Friendly, accurate shape and color so the food is easy " +
    "to recognize. Limited palette, no outlines, no text, no labels, no logos.",
} as const;
export type ImageStyle = keyof typeof IMAGE_STYLES;

export const imagePath = (slug: string, style: ImageStyle) => `foods/${style}/${slug}.webp`;
