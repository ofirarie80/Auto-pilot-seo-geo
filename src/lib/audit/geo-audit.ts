// Technical "AI-readiness" audit for a site: can AI crawlers reach it, and is it easy to understand and cite?
// Uses only public HTTP — no API keys needed.

export type CheckStatus = "pass" | "warn" | "fail";
export type Check = { id: string; title: string; status: CheckStatus; detail: string; fix?: string; weight: number };
export type AuditResult = { score: number; checks: Check[]; fetchedAt: string };

/** AI crawlers that matter for being found and cited. */
export const AI_BOTS: { ua: string; owner: string; critical: boolean }[] = [
  { ua: "OAI-SearchBot", owner: "ChatGPT Search", critical: true },
  { ua: "ChatGPT-User", owner: "ChatGPT", critical: true },
  { ua: "GPTBot", owner: "OpenAI (אימון)", critical: false },
  { ua: "PerplexityBot", owner: "Perplexity", critical: true },
  { ua: "Claude-SearchBot", owner: "Claude", critical: true },
  { ua: "ClaudeBot", owner: "Anthropic (אימון)", critical: false },
  { ua: "Google-Extended", owner: "Gemini", critical: false },
  { ua: "Applebot-Extended", owner: "Apple Intelligence", critical: false },
];

const UA = "Mozilla/5.0 (compatible; LionetPilot/1.0; +https://lionet.co.il)";

async function get(url: string, timeoutMs = 15000) {
  const ctrl = new AbortController();
  const t = setTimeout(() => ctrl.abort(), timeoutMs);
  const started = Date.now();
  try {
    const res = await fetch(url, { headers: { "user-agent": UA }, redirect: "follow", signal: ctrl.signal });
    const text = await res.text();
    return { ok: res.ok, status: res.status, text, url: res.url, ms: Date.now() - started, type: res.headers.get("content-type") ?? "" };
  } catch {
    return { ok: false, status: 0, text: "", url, ms: Date.now() - started, type: "" };
  } finally {
    clearTimeout(t);
  }
}

/** Is `/` disallowed for this user agent? Applies the bot's own group if present, else `*`. */
export function blocksRoot(robots: string, ua: string): boolean {
  const groups: { agents: string[]; rules: { allow: boolean; path: string }[] }[] = [];
  let current: (typeof groups)[number] | null = null;
  let lastWasAgent = false;
  for (const raw of robots.split(/\r?\n/)) {
    const line = raw.replace(/#.*/, "").trim();
    const m = line.match(/^([A-Za-z-]+)\s*:\s*(.*)$/);
    if (!m) continue;
    const key = m[1].toLowerCase();
    const val = m[2].trim();
    if (key === "user-agent") {
      if (!current || !lastWasAgent) {
        current = { agents: [], rules: [] };
        groups.push(current);
      }
      current.agents.push(val.toLowerCase());
      lastWasAgent = true;
    } else if ((key === "disallow" || key === "allow") && current) {
      current.rules.push({ allow: key === "allow", path: val });
      lastWasAgent = false;
    } else {
      lastWasAgent = false;
    }
  }
  const own = groups.filter((g) => g.agents.includes(ua.toLowerCase()));
  const pick = own.length ? own : groups.filter((g) => g.agents.includes("*"));
  const rules = pick.flatMap((g) => g.rules);
  const rootDisallowed = rules.some((r) => !r.allow && r.path === "/");
  const rootAllowed = rules.some((r) => r.allow && r.path === "/");
  return rootDisallowed && !rootAllowed;
}

function attr(tag: string, name: string) {
  return tag.match(new RegExp(`${name}\\s*=\\s*["']([^"']*)["']`, "i"))?.[1];
}

function schemaTypes(html: string): string[] {
  const types = new Set<string>();
  for (const m of html.matchAll(/<script[^>]+application\/ld\+json[^>]*>([\s\S]*?)<\/script>/gi)) {
    for (const t of m[1].matchAll(/"@type"\s*:\s*(\[[^\]]*\]|"[^"]+")/g)) {
      for (const v of t[1].matchAll(/"([^"]+)"/g)) types.add(v[1]);
    }
  }
  return [...types];
}

export async function auditSite(domain: string): Promise<AuditResult> {
  const origin = `https://${domain.replace(/^https?:\/\//, "").replace(/\/.*$/, "")}`;
  const [home, robots, llms] = await Promise.all([get(origin), get(`${origin}/robots.txt`), get(`${origin}/llms.txt`)]);
  const checks: Check[] = [];
  const add = (c: Check) => checks.push(c);

  // ── Reachability ──
  add({
    id: "home", title: "האתר זמין ב-HTTPS", weight: 15,
    status: home.ok && home.url.startsWith("https://") ? "pass" : "fail",
    detail: home.ok ? `נטען תוך ${home.ms}ms` : `שגיאה ${home.status || "חיבור"}`,
    fix: home.ok ? undefined : "לוודא שהאתר עולה ב-HTTPS ושאינו חוסם בוטים ברמת השרת או ה-CDN.",
  });
  if (home.ok) {
    add({
      id: "speed", title: "זמן טעינה", weight: 5,
      status: home.ms < 1500 ? "pass" : home.ms < 3500 ? "warn" : "fail",
      detail: `${home.ms}ms לעמוד הבית`,
      fix: home.ms < 1500 ? undefined : "בוטים של AI מוותרים על עמודים איטיים. לשפר מטמון ושרת.",
    });
  }

  // ── AI crawler access ──
  const robotsText = robots.ok && !/<html/i.test(robots.text) ? robots.text : "";
  const blocked = AI_BOTS.filter((b) => robotsText && blocksRoot(robotsText, b.ua));
  const blockedCritical = blocked.filter((b) => b.critical);
  add({
    id: "ai-bots", title: "בוטים של AI יכולים לסרוק", weight: 25,
    status: blockedCritical.length ? "fail" : blocked.length ? "warn" : "pass",
    detail: blocked.length ? `חסומים: ${blocked.map((b) => `${b.ua} (${b.owner})`).join(", ")}` : "אף בוט AI לא חסום ב-robots.txt",
    fix: blocked.length ? `להסיר את החסימה ב-robots.txt עבור ${blocked.map((b) => b.ua).join(", ")}.` : undefined,
  });
  const sitemapInRobots = /^\s*sitemap\s*:/im.test(robotsText);
  let sitemapOk = sitemapInRobots;
  if (!sitemapOk) {
    const sm = await get(`${origin}/sitemap.xml`);
    sitemapOk = sm.ok && /<(urlset|sitemapindex)/i.test(sm.text);
  }
  add({
    id: "sitemap", title: "Sitemap", weight: 8,
    status: sitemapOk ? "pass" : "fail",
    detail: sitemapOk ? (sitemapInRobots ? "מוגדר ב-robots.txt" : "נמצא sitemap.xml") : "לא נמצא sitemap",
    fix: sitemapOk ? undefined : "ליצור sitemap.xml ולהוסיף שורת Sitemap ל-robots.txt.",
  });
  const llmsOk = llms.ok && llms.text.trim().length > 50 && !/<html/i.test(llms.text);
  add({
    id: "llms", title: "קובץ llms.txt", weight: 7,
    status: llmsOk ? "pass" : "warn",
    detail: llmsOk ? "קיים" : "לא קיים",
    fix: llmsOk ? undefined : "להוסיף /llms.txt: תיאור קצר של העסק וקישורים לעמודים החשובים, בשפה פשוטה.",
  });

  // ── Understandable & citable ──
  if (home.ok) {
    const html = home.text;
    const title = html.match(/<title[^>]*>([\s\S]*?)<\/title>/i)?.[1]?.trim() ?? "";
    const descTag = html.match(/<meta[^>]+name=["']description["'][^>]*>/i)?.[0] ?? "";
    const desc = attr(descTag, "content") ?? "";
    const h1s = html.match(/<h1[\s>]/gi)?.length ?? 0;
    const lang = attr(html.match(/<html[^>]*>/i)?.[0] ?? "", "lang");
    const types = schemaTypes(html);
    const hasOrg = types.some((t) => /Organization|LocalBusiness|Corporation|ProfessionalService/i.test(t));
    const hasFaq = types.some((t) => /FAQPage/i.test(t));

    add({
      id: "title", title: "כותרת ותיאור", weight: 8,
      status: title && desc.length >= 50 ? "pass" : title ? "warn" : "fail",
      detail: `כותרת: ${title ? `${title.length} תווים` : "חסרה"} · תיאור: ${desc ? `${desc.length} תווים` : "חסר"}`,
      fix: title && desc.length >= 50 ? undefined : "לכתוב meta description של 120–160 תווים שמסביר מה העסק עושה ולמי.",
    });
    add({
      id: "h1", title: "כותרת H1 אחת", weight: 4,
      status: h1s === 1 ? "pass" : "warn",
      detail: `${h1s} כותרות H1 בעמוד הבית`,
      fix: h1s === 1 ? undefined : "עמוד הבית צריך H1 אחד שאומר במפורש מה העסק.",
    });
    add({
      id: "lang", title: "שפת העמוד מוגדרת", weight: 3,
      status: lang ? "pass" : "warn",
      detail: lang ? `lang="${lang}"` : "חסר lang",
      fix: lang ? undefined : 'להוסיף lang="he" לתגית html.',
    });
    add({
      id: "schema-org", title: "Schema של העסק", weight: 15,
      status: hasOrg ? "pass" : "fail",
      detail: types.length ? `נמצאו: ${types.slice(0, 6).join(", ")}` : "אין נתונים מובנים (JSON-LD)",
      fix: hasOrg ? undefined : "להוסיף Organization או LocalBusiness ב-JSON-LD: שם, לוגו, תיאור, טלפון ו-sameAs לרשתות.",
    });
    add({
      id: "schema-faq", title: "שאלות ותשובות (FAQ)", weight: 10,
      status: hasFaq ? "pass" : "warn",
      detail: hasFaq ? "יש FAQPage" : "אין FAQ מובנה",
      fix: hasFaq ? undefined : "לבנות FAQ סביב השאלות שלקוחות שואלים את ה-AI, עם FAQPage Schema. זה הפורמט שהכי קל לצטט.",
    });
  }

  const total = checks.reduce((s, c) => s + c.weight, 0);
  const got = checks.reduce((s, c) => s + (c.status === "pass" ? c.weight : c.status === "warn" ? c.weight / 2 : 0), 0);
  return { score: total ? Math.round((100 * got) / total) : 0, checks, fetchedAt: new Date().toISOString() };
}
