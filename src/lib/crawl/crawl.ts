import "server-only";
import { supabaseAdmin } from "@/lib/supabase/admin";

/**
 * Full-site crawl. Pages come from the sitemap (or, without one, from links found while crawling).
 * Work is done in short steps so it fits serverless time limits; each step chains the next.
 */

const UA = "Mozilla/5.0 (compatible; LionetPilot/1.0; +https://lionet.co.il)";
const CONCURRENCY = 6;
const BATCH = 36;

export type Severity = "fail" | "warn";
export const ISSUES: Record<string, { label: string; severity: Severity; fix: string }> = {
  http_4xx: { label: "העמוד מחזיר שגיאה (404 וכד')", severity: "fail", fix: "להחזיר את העמוד, או להפנות (301) לעמוד מתאים ולהסיר מה-sitemap." },
  http_5xx: { label: "שגיאת שרת", severity: "fail", fix: "לבדוק את השרת/תוסף שגורם לשגיאה בעמוד." },
  unreachable: { label: "העמוד לא נטען", severity: "fail", fix: "לבדוק חסימה של בוטים ב-CDN או בשרת." },
  noindex: { label: "חסום לגוגל (noindex)", severity: "fail", fix: "אם העמוד צריך להופיע בגוגל, להסיר noindex. אם לא, להוציא אותו מה-sitemap." },
  no_title: { label: "אין כותרת (title)", severity: "fail", fix: "להוסיף title ייחודי של 30–60 תווים." },
  dup_title: { label: "כותרת כפולה", severity: "warn", fix: "לתת לכל עמוד title ייחודי." },
  title_long: { label: "כותרת ארוכה מדי", severity: "warn", fix: "לקצר ל-60 תווים בערך, כדי שלא תיחתך בגוגל." },
  title_short: { label: "כותרת קצרה מדי", severity: "warn", fix: "להרחיב ל-30–60 תווים עם מילת המפתח." },
  no_meta: { label: "אין תיאור מטא", severity: "warn", fix: "להוסיף meta description של 120–155 תווים." },
  dup_meta: { label: "תיאור מטא כפול", severity: "warn", fix: "לכתוב תיאור ייחודי לכל עמוד." },
  no_h1: { label: "אין כותרת H1", severity: "fail", fix: "להוסיף H1 אחד שמתאר את העמוד." },
  multi_h1: { label: "כמה כותרות H1", severity: "warn", fix: "להשאיר H1 אחד, את השאר להפוך ל-H2." },
  thin: { label: "מעט תוכן (פחות מ-250 מילים)", severity: "warn", fix: "להרחיב את התוכן או לאחד עם עמוד דומה." },
  no_schema: { label: "אין Schema", severity: "warn", fix: "להוסיף נתונים מובנים (Organization, Article, FAQ, Product)." },
  img_alt: { label: "תמונות בלי טקסט חלופי (alt)", severity: "warn", fix: "להוסיף alt שמתאר כל תמונה." },
  slow: { label: "עמוד איטי (מעל 3 שניות)", severity: "warn", fix: "לדחוס תמונות, להפעיל cache ולצמצם סקריפטים." },
  redirect: { label: "כתובת שמפנה לכתובת אחרת", severity: "warn", fix: "לעדכן את הקישורים וה-sitemap לכתובת הסופית." },
  canonical_other: { label: "canonical מצביע לעמוד אחר", severity: "warn", fix: "לוודא שזה מכוון. אם לא, להפנות ל-canonical של העמוד עצמו." },
  broken_links: { label: "מקשר לעמודים שבורים", severity: "fail", fix: "לתקן או להסיר את הקישורים לעמודים שמחזירים שגיאה." },
};

export type CrawlSummary = {
  mode: "sitemap" | "links";
  pages: number;
  healthy: number;
  score: number;
  issues: Record<string, number>;
  avgLoadMs: number | null;
};

const normHost = (h: string) => h.toLowerCase().replace(/^www\./, "");

/** One spelling per path: "%d7%90", "%D7%90" and raw Hebrew all become the same string. */
function canonPath(p: string) {
  try {
    return encodeURI(decodeURI(p));
  } catch {
    return p;
  }
}

function normalize(href: string, base: string, host: string): string | null {
  try {
    const u = new URL(href, base);
    if (!/^https?:$/.test(u.protocol) || normHost(u.hostname) !== host) return null;
    if (/\.(jpe?g|png|gif|webp|svg|pdf|zip|mp4|mp3|webm|css|js|xml|ico|docx?|xlsx?)$/i.test(u.pathname)) return null;
    if (/\/(wp-admin|wp-json|wp-login|cart|checkout|my-account|feed)\b/i.test(u.pathname)) return null;
    u.hash = "";
    u.search = "";
    u.pathname = canonPath(u.pathname);
    return u.toString();
  } catch {
    return null;
  }
}

async function get(url: string, timeoutMs = 15000) {
  const ctrl = new AbortController();
  const t = setTimeout(() => ctrl.abort(), timeoutMs);
  const started = Date.now();
  try {
    const res = await fetch(url, { headers: { "user-agent": UA, accept: "text/html,application/xml;q=0.9,*/*;q=0.8" }, redirect: "follow", signal: ctrl.signal });
    const type = res.headers.get("content-type") ?? "";
    const text = /html|xml|text/i.test(type) ? await res.text() : "";
    return { status: res.status, url: res.url || url, text, type, ms: Date.now() - started, robots: res.headers.get("x-robots-tag") ?? "" };
  } catch {
    return { status: 0, url, text: "", type: "", ms: Date.now() - started, robots: "" };
  } finally {
    clearTimeout(t);
  }
}

/** URLs listed in the site's sitemaps (follows sitemap indexes). */
async function sitemapUrls(origin: string, host: string, limit: number): Promise<string[]> {
  const robots = await get(`${origin}/robots.txt`);
  const fromRobots = [...robots.text.matchAll(/^\s*sitemap\s*:\s*(\S+)/gim)].map((m) => m[1]);
  const queue = [...new Set([...fromRobots, `${origin}/sitemap.xml`, `${origin}/sitemap_index.xml`, `${origin}/wp-sitemap.xml`])];
  const seenMaps = new Set<string>();
  const urls = new Set<string>();
  while (queue.length && seenMaps.size < 40 && urls.size < limit) {
    const sm = queue.shift()!;
    if (seenMaps.has(sm)) continue;
    seenMaps.add(sm);
    const r = await get(sm);
    if (r.status !== 200 || !/<(urlset|sitemapindex)/i.test(r.text)) continue;
    const locs = [...r.text.matchAll(/<loc>\s*(?:<!\[CDATA\[)?\s*([^<\]\s]+)/gi)].map((m) => m[1].replace(/&amp;/g, "&"));
    if (/<sitemapindex/i.test(r.text)) queue.push(...locs);
    else for (const l of locs) {
      const n = normalize(l, origin, host);
      if (n) urls.add(n);
      if (urls.size >= limit) break;
    }
    // Once one sitemap family worked, skip the generic fallbacks.
    if (urls.size) queue.splice(0, queue.length, ...queue.filter((q) => !/\/(sitemap|sitemap_index|wp-sitemap)\.xml$/.test(q) || seenMaps.has(q)));
  }
  return [...urls];
}

const decode = (s: string) => s.replace(/&amp;/g, "&").replace(/&quot;/g, '"').replace(/&#0?39;|&apos;/g, "'").replace(/&lt;/g, "<").replace(/&gt;/g, ">").replace(/&nbsp;/g, " ").replace(/\s+/g, " ").trim();
const attr = (tag: string, name: string) => tag.match(new RegExp(`\\b${name}\\s*=\\s*["']([^"']*)["']`, "i"))?.[1];

function parsePage(html: string, finalUrl: string, host: string) {
  const head = html.slice(0, 200_000);
  const title = decode(head.match(/<title[^>]*>([\s\S]*?)<\/title>/i)?.[1] ?? "");
  const metas = [...head.matchAll(/<meta\b[^>]*>/gi)].map((m) => m[0]);
  const metaBy = (n: string) => metas.find((m) => (attr(m, "name") ?? "").toLowerCase() === n);
  const description = decode(attr(metaBy("description") ?? "", "content") ?? "");
  const robots = (attr(metaBy("robots") ?? "", "content") ?? "").toLowerCase();
  const canonicalTag = [...head.matchAll(/<link\b[^>]*>/gi)].map((m) => m[0]).find((l) => /rel\s*=\s*["']canonical["']/i.test(l));
  const canonical = canonicalTag ? attr(canonicalTag, "href") ?? null : null;
  const lang = html.match(/<html\b[^>]*\blang\s*=\s*["']([^"']+)/i)?.[1] ?? null;
  const h1s = [...html.matchAll(/<h1\b[^>]*>([\s\S]*?)<\/h1>/gi)].map((m) => decode(m[1].replace(/<[^>]+>/g, " ")));
  const schemaTypes = new Set<string>();
  for (const m of html.matchAll(/<script[^>]+application\/ld\+json[^>]*>([\s\S]*?)<\/script>/gi)) {
    for (const t of m[1].matchAll(/"@type"\s*:\s*(\[[^\]]*\]|"[^"]+")/g)) for (const v of t[1].matchAll(/"([^"]+)"/g)) schemaTypes.add(v[1]);
  }
  // Images outside <noscript> (tracking pixels live there); alt="" is valid for decorative images, so only a missing alt counts.
  const imgs = [...html.replace(/<noscript\b[\s\S]*?<\/noscript>/gi, " ").matchAll(/<img\b[^>]*>/gi)].map((m) => m[0])
    .filter((i) => !/\b(width|height)\s*=\s*["']?1["'\s>]/i.test(i));
  const noAlt = imgs.filter((i) => !/\balt\s*=/i.test(i)).length;
  const body = html.replace(/<(script|style|noscript|svg|template)\b[\s\S]*?<\/\1>/gi, " ").replace(/<(header|footer|nav)\b[\s\S]*?<\/\1>/gi, " ");
  const text = decode(body.replace(/<[^>]+>/g, " "));
  const words = text ? text.split(" ").filter((w) => /[\p{L}\p{N}]/u.test(w)).length : 0;
  const links = new Set<string>();
  for (const m of html.matchAll(/<a\b[^>]*\bhref\s*=\s*["']([^"'#][^"']*)["']/gi)) {
    const n = normalize(decode(m[1]), finalUrl, host);
    if (n) links.add(n);
  }
  return { title, description, robots, canonical, lang, h1s, schemaTypes: [...schemaTypes], imgs: imgs.length, noAlt, words, links: [...links].slice(0, 300) };
}

const sameUrl = (a: string, b: string) => {
  try {
    const x = new URL(a), y = new URL(b);
    return normHost(x.hostname) === normHost(y.hostname) && canonPath(x.pathname).replace(/\/$/, "") === canonPath(y.pathname).replace(/\/$/, "");
  } catch {
    return a === b;
  }
};

async function crawlOne(url: string, host: string) {
  const r = await get(url);
  const issues: string[] = [];
  const row: Record<string, unknown> = { fetched_at: new Date().toISOString(), status_code: r.status, final_url: r.url, load_ms: r.ms };
  if (!r.status) issues.push("unreachable");
  else if (r.status >= 500) issues.push("http_5xx");
  else if (r.status >= 400) issues.push("http_4xx");
  if (r.status && !sameUrl(r.url, url)) issues.push("redirect");
  if (r.status >= 200 && r.status < 300 && /html/i.test(r.type)) {
    const p = parsePage(r.text, r.url, host);
    Object.assign(row, {
      title: p.title || null, meta_description: p.description || null, h1: p.h1s[0] ?? null, h1_count: p.h1s.length,
      canonical: p.canonical, noindex: /noindex/.test(p.robots) || /noindex/i.test(r.robots), lang: p.lang,
      word_count: p.words, schema_types: p.schemaTypes, images: p.imgs, images_no_alt: p.noAlt, links: p.links,
    });
    if (row.noindex) issues.push("noindex");
    if (!p.title) issues.push("no_title");
    else if (p.title.length > 65) issues.push("title_long");
    else if (p.title.length < 20) issues.push("title_short");
    if (!p.description) issues.push("no_meta");
    if (!p.h1s.length) issues.push("no_h1");
    else if (p.h1s.length > 1) issues.push("multi_h1");
    if (p.words < 250) issues.push("thin");
    if (!p.schemaTypes.length) issues.push("no_schema");
    if (p.noAlt > 0) issues.push("img_alt");
    if (p.canonical && !sameUrl(new URL(p.canonical, r.url).toString(), r.url)) issues.push("canonical_other");
  }
  if (r.ms > 3000) issues.push("slow");
  row.issues = issues;
  return row;
}

async function pool<T>(items: T[], n: number, fn: (x: T) => Promise<void>) {
  let i = 0;
  await Promise.all(Array.from({ length: Math.min(n, items.length) }, async () => {
    while (i < items.length) await fn(items[i++]);
  }));
}

/** Creates a crawl for a site and lists its pages. Returns the crawl id. */
export async function startCrawl(siteId: string): Promise<string> {
  const db = supabaseAdmin();
  const { data: site } = await db.from("sites").select("domain, organizations(plans(crawl_pages))").eq("id", siteId).single();
  if (!site) throw new Error("site_not_found");
  const limit = (site.organizations as unknown as { plans: { crawl_pages: number } | null } | null)?.plans?.crawl_pages ?? 25;

  const { data: running } = await db.from("site_crawls").select("id").eq("site_id", siteId).eq("status", "running").maybeSingle();
  if (running) return running.id;

  const host = normHost(site.domain.replace(/^https?:\/\//, "").replace(/\/.*$/, ""));
  const home = await get(`https://${site.domain.replace(/^https?:\/\//, "").replace(/\/.*$/, "")}/`);
  const origin = new URL(home.url || `https://${host}/`).origin;
  const fromMap = await sitemapUrls(origin, host, limit);
  const homeUrl = normalize(origin + "/", origin, host)!;
  const urls = [homeUrl, ...fromMap.filter((u) => !sameUrl(u, homeUrl))].slice(0, limit);
  const mode = fromMap.length ? "sitemap" : "links";

  const { data: crawl, error } = await db.from("site_crawls")
    .insert({ site_id: siteId, page_limit: limit, pages_found: urls.length, summary: { mode } }).select("id").single();
  if (error || !crawl) throw new Error("crawl_create_failed");
  for (let i = 0; i < urls.length; i += 500) {
    await db.from("crawl_pages").insert(urls.slice(i, i + 500).map((url) => ({ crawl_id: crawl.id, site_id: siteId, url, depth: url === homeUrl ? 0 : 1 })));
  }
  return crawl.id;
}

/** Crawls the next batch of pages within the time budget. Returns true when more work is left. */
export async function stepCrawl(crawlId: string, budgetMs = 45_000): Promise<boolean> {
  const db = supabaseAdmin();
  const started = Date.now();
  // Claim the crawl so two steps never run at once.
  const stale = new Date(Date.now() - 70_000).toISOString();
  const { data: claimed } = await db.from("site_crawls").update({ step_at: new Date().toISOString() })
    .eq("id", crawlId).eq("status", "running").or(`step_at.is.null,step_at.lt.${stale}`)
    .select("id, site_id, page_limit, pages_found, summary, sites(domain)").maybeSingle();
  if (!claimed) return false;
  const host = normHost(((claimed.sites as unknown as { domain: string }).domain).replace(/^https?:\/\//, "").replace(/\/.*$/, ""));
  const linkMode = (claimed.summary as { mode?: string } | null)?.mode === "links";
  let found = claimed.pages_found;

  while (Date.now() - started < budgetMs) {
    const { data: todo } = await db.from("crawl_pages").select("url, depth").eq("crawl_id", crawlId).is("fetched_at", null).order("depth").limit(BATCH);
    if (!todo?.length) break;
    await pool(todo, CONCURRENCY, async (p) => {
      const row = await crawlOne(p.url, host);
      await db.from("crawl_pages").update(row).eq("crawl_id", crawlId).eq("url", p.url);
      if (linkMode && found < claimed.page_limit && Array.isArray(row.links) && p.depth < 4) {
        const fresh = (row.links as string[]).slice(0, claimed.page_limit - found);
        if (fresh.length) {
          const { data: added } = await db.from("crawl_pages")
            .upsert(fresh.map((url) => ({ crawl_id: crawlId, site_id: claimed.site_id, url, depth: p.depth + 1 })), { onConflict: "crawl_id,url", ignoreDuplicates: true })
            .select("url");
          found += added?.length ?? 0;
        }
      }
    });
    const { count } = await db.from("crawl_pages").select("url", { count: "exact", head: true }).eq("crawl_id", crawlId).not("fetched_at", "is", null);
    await db.from("site_crawls").update({ pages_done: count ?? 0, pages_found: found, step_at: new Date().toISOString() }).eq("id", crawlId);
  }

  const { count: left } = await db.from("crawl_pages").select("url", { count: "exact", head: true }).eq("crawl_id", crawlId).is("fetched_at", null);
  if (left) {
    await db.from("site_crawls").update({ step_at: null }).eq("id", crawlId); // release the claim for the next step
    return true;
  }
  await finishCrawl(crawlId, (claimed.summary as { mode: "sitemap" | "links" }).mode ?? "sitemap");
  return false;
}

/** Cross-page checks (duplicates, broken links) and the summary. */
async function finishCrawl(crawlId: string, mode: "sitemap" | "links") {
  const db = supabaseAdmin();
  const pages: { url: string; status_code: number | null; title: string | null; meta_description: string | null; links: string[] | null; issues: string[]; load_ms: number | null; noindex: boolean | null }[] = [];
  for (let from = 0; ; from += 1000) {
    const { data } = await db.from("crawl_pages").select("url, status_code, title, meta_description, links, issues, load_ms, noindex").eq("crawl_id", crawlId).range(from, from + 999);
    pages.push(...(data ?? []));
    if (!data || data.length < 1000) break;
  }
  const ok = pages.filter((p) => p.status_code && p.status_code < 300 && !p.noindex);
  const dupes = (k: "title" | "meta_description") => {
    const m = new Map<string, number>();
    for (const p of ok) if (p[k]) m.set(p[k]!.toLowerCase(), (m.get(p[k]!.toLowerCase()) ?? 0) + 1);
    return m;
  };
  const titles = dupes("title"), metas = dupes("meta_description");
  const broken = new Set(pages.filter((p) => (p.status_code ?? 0) >= 400 || p.status_code === 0).map((p) => p.url));

  const updates: { url: string; issues: string[] }[] = [];
  for (const p of pages) {
    const extra: string[] = [];
    if (p.title && (titles.get(p.title.toLowerCase()) ?? 0) > 1) extra.push("dup_title");
    if (p.meta_description && (metas.get(p.meta_description.toLowerCase()) ?? 0) > 1) extra.push("dup_meta");
    if ((p.links ?? []).some((l) => broken.has(l))) extra.push("broken_links");
    if (extra.length) {
      p.issues = [...new Set([...p.issues, ...extra])];
      updates.push({ url: p.url, issues: p.issues });
    }
  }
  await pool(updates, 8, async (u) => { await db.from("crawl_pages").update({ issues: u.issues }).eq("crawl_id", crawlId).eq("url", u.url); });

  const issues: Record<string, number> = {};
  for (const p of pages) for (const i of p.issues) issues[i] = (issues[i] ?? 0) + 1;
  const healthy = pages.filter((p) => !p.issues.some((i) => ISSUES[i]?.severity === "fail")).length;
  // Score: fail issues weigh 3, warnings 1, normalized per page.
  const penalty = pages.reduce((a, p) => a + Math.min(10, p.issues.reduce((s, i) => s + (ISSUES[i]?.severity === "fail" ? 3 : 1), 0)), 0);
  const loads = pages.map((p) => p.load_ms).filter((n): n is number => !!n);
  const summary: CrawlSummary = {
    mode, pages: pages.length, healthy,
    score: pages.length ? Math.max(0, Math.round(100 - (100 * penalty) / (pages.length * 10))) : 0,
    issues, avgLoadMs: loads.length ? Math.round(loads.reduce((a, b) => a + b, 0) / loads.length) : null,
  };
  await db.from("site_crawls").update({ status: "done", summary, pages_done: pages.length, finished_at: new Date().toISOString(), step_at: null }).eq("id", crawlId);
}

/** Fires the next step in the background (separate function invocation). */
export function chainStep(origin: string, crawlId: string) {
  const key = process.env.CRON_SECRET;
  if (!key) return Promise.resolve();
  // Only make sure the request is delivered; the next step runs in its own invocation.
  const ctrl = new AbortController();
  const t = setTimeout(() => ctrl.abort(), 2500);
  return fetch(`${origin}/api/crawl/step?crawl=${crawlId}`, { headers: { authorization: `Bearer ${key}` }, signal: ctrl.signal })
    .then(() => undefined).catch(() => undefined).finally(() => clearTimeout(t));
}
