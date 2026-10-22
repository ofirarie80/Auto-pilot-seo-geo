import "server-only";
import { supabaseAdmin } from "@/lib/supabase/admin";
import { decrypt } from "@/lib/crypto";
import { refreshAccess } from "./oauth";
import { query } from "./gsc";

const day = (d: Date) => d.toISOString().slice(0, 10);
const minus = (d: Date, n: number) => new Date(d.getTime() - n * 864e5);

/** Pulls 56 days of Search Console data for one site: daily totals + top queries/pages for both 28-day halves. */
export async function syncSite(siteId: string) {
  const db = supabaseAdmin();
  const { data: site } = await db
    .from("sites").select("id, org_id, gsc_property, organizations(plans(gsc))").eq("id", siteId).single();
  if (!site?.gsc_property) throw new Error("no_property");
  const gsc = (site.organizations as unknown as { plans: { gsc: boolean } | null } | null)?.plans?.gsc;
  if (!gsc) throw new Error("plan_no_gsc");

  const { data: conn } = await db.from("google_connections").select("refresh_token_enc").eq("org_id", site.org_id).maybeSingle();
  if (!conn) throw new Error("not_connected");
  const token = await refreshAccess(decrypt(conn.refresh_token_enc));

  const end = minus(new Date(), 3); // Search Console data settles after ~2-3 days
  const curStart = minus(end, 27);
  const prevEnd = minus(curStart, 1);
  const prevStart = minus(prevEnd, 27);
  const p = site.gsc_property;

  const [daily, qCur, qPrev, pCur, pPrev] = await Promise.all([
    query(token, p, day(prevStart), day(end), ["date"], 100),
    query(token, p, day(curStart), day(end), ["query"], 250),
    query(token, p, day(prevStart), day(prevEnd), ["query"], 500),
    query(token, p, day(curStart), day(end), ["page"], 250),
    query(token, p, day(prevStart), day(prevEnd), ["page"], 500),
  ]);

  const toRow = (period: string, kind: string) => (r: { keys?: string[]; clicks: number; impressions: number; ctr: number; position: number }) => ({
    site_id: siteId, period, kind, key: r.keys?.[0] ?? "", clicks: r.clicks, impressions: r.impressions, ctr: r.ctr, position: r.position,
  });

  await db.from("gsc_daily").delete().eq("site_id", siteId);
  if (daily.length) {
    await db.from("gsc_daily").insert(daily.map((r) => ({
      site_id: siteId, date: r.keys?.[0], clicks: r.clicks, impressions: r.impressions, ctr: r.ctr, position: r.position,
    })));
  }
  await db.from("gsc_rows").delete().eq("site_id", siteId);
  const rows = [
    ...qCur.map(toRow("current", "query")), ...qPrev.map(toRow("previous", "query")),
    ...pCur.map(toRow("current", "page")), ...pPrev.map(toRow("previous", "page")),
  ].filter((r) => r.key);
  for (let i = 0; i < rows.length; i += 500) await db.from("gsc_rows").insert(rows.slice(i, i + 500));

  await db.from("sites").update({ gsc_synced_at: new Date().toISOString() }).eq("id", siteId);
  return { days: daily.length, queries: qCur.length, pages: pCur.length };
}
