// Prebuild: list generated food illustrations in Vercel Blob and write data/food-images.json.
// Without a Blob token (local builds) the existing manifest is kept.
import { list } from "@vercel/blob";
import { writeFileSync, existsSync } from "node:fs";

const out = new URL("../data/food-images.json", import.meta.url);
if (!process.env.BLOB_READ_WRITE_TOKEN) {
  if (!existsSync(out)) writeFileSync(out, "{}\n");
  console.log("image-manifest: no BLOB_READ_WRITE_TOKEN, keeping existing manifest");
  process.exit(0);
}
const map = {};
let cursor;
do {
  const r = await list({ prefix: "foods/cutout/", cursor, limit: 1000 });
  for (const b of r.blobs) map[decodeURIComponent(b.pathname.slice("foods/cutout/".length).replace(/\.webp$/, ""))] = b.url;
  cursor = r.hasMore ? r.cursor : undefined;
} while (cursor);
writeFileSync(out, JSON.stringify(map, null, 0) + "\n");
console.log(`image-manifest: ${Object.keys(map).length} food images`);
