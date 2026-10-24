import { list, put } from "@vercel/blob";
import { foods, getFood } from "@/lib/data";
import { IMAGE_STYLES, imagePath } from "@/lib/images";

export const dynamic = "force-dynamic";
export const maxDuration = 300;

/**
 * Generates transparent food illustrations for foods that do not have one yet, several in parallel.
 * GET /api/admin/images/batch?key=<IMAGE_ADMIN_SECRET>&n=6[&slugs=a,b,c]
 * Returns what was created and how many foods are still missing.
 */
export async function GET(req: Request) {
  const u = new URL(req.url);
  if (!process.env.IMAGE_ADMIN_SECRET || u.searchParams.get("key") !== process.env.IMAGE_ADMIN_SECRET) return Response.json({ error: "forbidden" }, { status: 403 });
  if (!process.env.OPENAI_API_KEY || !process.env.BLOB_READ_WRITE_TOKEN) return Response.json({ error: "missing env" }, { status: 500 });
  const n = Math.min(Number(u.searchParams.get("n") || 6), 10);

  const have = new Set<string>();
  let cursor: string | undefined;
  do {
    const r = await list({ prefix: "foods/cutout/", cursor, limit: 1000 });
    r.blobs.forEach((b) => have.add(decodeURIComponent(b.pathname.slice("foods/cutout/".length).replace(/\.webp$/, ""))));
    cursor = r.hasMore ? r.cursor : undefined;
  } while (cursor);

  const wanted = (u.searchParams.get("slugs") || "").split(",").map((s) => s.trim()).filter(Boolean);
  const pool = wanted.length ? wanted.map((s) => getFood(s)).filter((f): f is NonNullable<typeof f> => !!f) : foods;
  const queue = pool.filter((f) => !have.has(f.slug)).slice(0, n);

  const results = await Promise.all(queue.map(async (f) => {
    const what = (f.en || f.usda).replace(/\s+/g, " ");
    const prompt = IMAGE_STYLES.cutout.replace("{food}", `${f.name} (${what}), shown the way it is usually eaten or sold in Israel`);
    try {
      const r = await fetch("https://api.openai.com/v1/images/generations", {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${process.env.OPENAI_API_KEY}` },
        body: JSON.stringify({ model: "gpt-image-1.5", prompt, size: "1024x1024", quality: "medium", output_format: "webp", output_compression: 82, background: "transparent", n: 1 }),
      });
      const j = await r.json();
      if (!r.ok) return { slug: f.slug, ok: false, error: j?.error?.message || String(r.status) };
      const blob = await put(imagePath(f.slug, "cutout"), Buffer.from(j.data[0].b64_json, "base64"), { access: "public", contentType: "image/webp", addRandomSuffix: false, allowOverwrite: true });
      return { slug: f.slug, ok: true, url: blob.url };
    } catch (e) {
      return { slug: f.slug, ok: false, error: String(e) };
    }
  }));

  const created = results.filter((r) => r.ok).length;
  return Response.json({ created, createdSlugs: results.filter((r) => r.ok).map((r) => r.slug), failed: results.filter((r) => !r.ok), missing: foods.length - have.size - created, total: foods.length });
}
