import type { Metadata } from "next";
import { list } from "@vercel/blob";
import { getFood } from "@/lib/data";

export const dynamic = "force-dynamic";
export const metadata: Metadata = { title: "גלריית תמונות (פנימי)", robots: { index: false, follow: false } };

export default async function ImagesAdmin() {
  if (!process.env.BLOB_READ_WRITE_TOKEN) return <div className="wrap" style={{ padding: 40 }}>אין חיבור לאחסון תמונות.</div>;
  const { blobs } = await list({ prefix: "foods/" });
  const bySlug = new Map<string, Record<string, string>>();
  for (const b of blobs) {
    const [, style, file] = b.pathname.split("/");
    const slug = decodeURIComponent(file.replace(/\.webp$/, ""));
    bySlug.set(slug, { ...(bySlug.get(slug) || {}), [style]: b.url });
  }
  const rows = [...bySlug.entries()];
  return (
    <div className="wrap" style={{ padding: "28px 0 60px" }}>
      <h1>גלריית תמונות לבדיקה</h1>
      <p className="muted">דף פנימי, חסום לגוגל. כל שורה היא מאכל אחד בשני הסגנונות.</p>
      <div style={{ display: "grid", gap: 28, marginTop: 20 }}>
        {rows.map(([slug, s]) => (
          <section key={slug}>
            <h2 style={{ fontSize: 22, marginBottom: 10 }}>{getFood(slug)?.name || slug}</h2>
            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(260px, 1fr))", gap: 16 }}>
              {(["photo", "illustration"] as const).map((st) => (
                <figure key={st} style={{ margin: 0 }}>
                  {s[st] ? <img src={s[st]} alt={`${getFood(slug)?.name} – ${st}`} style={{ width: "100%", borderRadius: 16, display: "block" }} /> : <div className="muted">—</div>}
                  <figcaption className="muted" style={{ marginTop: 6 }}>{st === "photo" ? "סגנון צילום" : "סגנון איור"}</figcaption>
                </figure>
              ))}
            </div>
          </section>
        ))}
        {!rows.length && <p>עוד אין תמונות.</p>}
      </div>
    </div>
  );
}
