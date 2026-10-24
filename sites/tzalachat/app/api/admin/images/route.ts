import { put } from "@vercel/blob";
import { getFood } from "@/lib/data";
import { IMAGE_STYLES, imagePath, type ImageStyle } from "@/lib/images";

export const dynamic = "force-dynamic";
export const maxDuration = 120;

/**
 * Generates one food image with OpenAI and stores it in Vercel Blob.
 * GET /api/admin/images?key=<IMAGE_ADMIN_SECRET>&slug=<food slug>&style=photo|illustration&en=<english name>
 */
export async function GET(req: Request) {
  const u = new URL(req.url);
  const secret = process.env.IMAGE_ADMIN_SECRET;
  if (!secret || u.searchParams.get("key") !== secret) return Response.json({ error: "forbidden" }, { status: 403 });
  if (!process.env.OPENAI_API_KEY) return Response.json({ error: "OPENAI_API_KEY missing" }, { status: 500 });
  if (!process.env.BLOB_READ_WRITE_TOKEN) return Response.json({ error: "BLOB_READ_WRITE_TOKEN missing" }, { status: 500 });

  const slug = u.searchParams.get("slug") || "";
  const style = (u.searchParams.get("style") || "photo") as ImageStyle;
  const food = getFood(slug);
  if (!food) return Response.json({ error: "unknown food" }, { status: 404 });
  if (!(style in IMAGE_STYLES)) return Response.json({ error: "unknown style" }, { status: 400 });
  const en = u.searchParams.get("en") || food.usda;
  const prompt = IMAGE_STYLES[style].replace("{food}", `${en} (Hebrew: ${food.name})`);

  const r = await fetch("https://api.openai.com/v1/images/generations", {
    method: "POST",
    headers: { "Content-Type": "application/json", Authorization: `Bearer ${process.env.OPENAI_API_KEY}` },
    body: JSON.stringify({ model: "gpt-image-1", prompt, size: "1024x1024", quality: "medium", output_format: "webp", output_compression: 82, n: 1 }),
  });
  const j = await r.json();
  if (!r.ok) return Response.json({ error: "openai", status: r.status, detail: j?.error?.message || j }, { status: 502 });
  const bytes = Buffer.from(j.data[0].b64_json, "base64");
  const blob = await put(imagePath(food.slug, style), bytes, { access: "public", contentType: "image/webp", addRandomSuffix: false, allowOverwrite: true });
  return Response.json({ ok: true, slug: food.slug, style, url: blob.url, kb: Math.round(bytes.length / 1024), prompt });
}
