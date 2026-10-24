# Routine playbooks

Each routine: goal, inputs, steps, output. "GSC" means the Ahrefs Search Console tools
(`gsc-keywords`, `gsc-pages`, `gsc-page-history`, `gsc-keyword-history`, `gsc-ctr-by-position`, …) for the
site's domain; call the Ahrefs `doc` tool before first use. Compare the last 28 days unless stated.

---

## gsc-gap-pages: ביטויים בלי עמוד (weekly)

**Goal:** Google already shows us for a query, but from a page that is not about it. A dedicated page wins it.
1. GSC keywords with impressions ≥ 30, position 5–50. Keep the ranking URL for each.
2. A query is a **gap** when the ranking page is not its natural answer: a category or list page ranking for a
   specific food ("קלוריות בקלמנטינה" on /category/fruits), a recipe ranking for a different dish, the home page,
   or a food page ranking for a question it does not answer (e.g. "כמה חלבון יש ב-100 גרם חזה עוף מבושל" on raw).
3. Group queries by intent. Each group = one candidate page (new food, recipe, comparison, list, FAQ entry,
   or a serving/state variant like "מבושל").
4. Hand the top 5 by impressions to the writer agent, then the reviewer. Link the new page from the page that
   ranked before (so Google sees the move).
**Output:** list of gaps (query, impressions, position, old page → new page).

## food-images: איורים למאכלים חדשים (weekly)

**Goal:** every food page has a transparent-background illustration (the house style, approved 2026-10-24).
1. Find the latest READY deployment of the Vercel project (any branch) and call, with the Vercel `web_fetch_vercel_url`
   tool, `<deployment>/api/admin/images/batch?key=<IMAGE_ADMIN_SECRET>&n=10` repeatedly (one call at a time, never in
   parallel) until `missing` is 0 or 30 calls were made. The key is in the control board
   (`ArtifactData` get, collection `config`, doc `images`, field `adminKey`); never write it into the repo. New foods from this week's content run come first: pass their slugs
   with `&slugs=a,b,c` before the general calls.
2. Images appear on the site at the next build (the prebuild step lists them from Blob). No commit is needed.
3. Report how many were created and how many are still missing. Open `/admin/images` on the deployment and list
   any image whose food looks wrong (wrong food, packaging, text in the image) so it can be regenerated
   (`/api/admin/images?...&slug=<slug>&style=cutout` overwrites it).

## striking-distance: דחיפת מקומות 4–20 (weekly)

**Goal:** the fastest traffic gains are queries at positions 4–20 with real volume.
1. GSC keywords at position 4–20, sorted by impressions × (21 − position). Top 15.
2. For each page involved, check and fix: the exact query (or a close variant) is in the title and H1; the
   first paragraph answers it in one sentence; there is an FAQ entry for related questions; at least 3
   internal links point to the page with descriptive anchors; the schema is valid.
3. Changes are small text and linking edits through the writer agent, then the reviewer.
4. Pages that still do not move after 3 rounds → add to the monthly link plan.
**Output:** table of page, query, position before, what changed.

## ctr-titles: שיפור CTR (every 2 weeks)

1. GSC pages with impressions ≥ 200 and CTR below the site's expected CTR for their position
   (`gsc-ctr-by-position`).
2. Rewrite title and meta description: number first ("89 קלוריות בבננה"), the serving people care about,
   a clear benefit, under 60 / 155 characters. No clickbait, no claims the page does not support.
3. Keep a log in the report (old title, new title, date) and compare CTR next run. Revert titles that lost CTR.

## content-refresh: רענון דפים שיורדים (monthly)

1. GSC pages whose clicks dropped ≥ 30% vs the previous 28 days (ignore pages under 20 clicks, and seasonal pages
   out of season).
2. Find why: lost position on a query (which), a competitor page, or a SERP change (AI Overview, new feature).
3. Refresh: add what searchers now want (new FAQ, serving sizes, comparison table), update the date, strengthen
   internal links.

## cannibalization: דפים שמתחרים זה בזה (monthly)

1. GSC queries where 2+ of our URLs got impressions in the period.
2. Decide the main page per query. Make the other page clearly different, or merge it into the main page with a
   redirect. Point internal links with that anchor at the main page only.

## question-mining: כריית שאלות ו-FAQ (every 2 weeks)

1. Ahrefs matching terms with question words for the site's main topics: "כמה", "מה", "האם", "למה", "איך",
   "מתי", "מה יותר", plus GSC queries that are questions.
2. Each question becomes an FAQ entry on the page that should own it (short direct answer from our data, then
   detail), or a new page when volume ≥ 300 and no page fits.
3. Questions are also GEO fuel: AI engines answer them and cite pages that answer directly.

## seasonal: לוח עונתי וחגים (monthly)

1. From `site.json.seasons`, take seasons starting in the next 6–10 weeks (Google needs time to index and rank).
2. Check which topics have pages; build the missing ones (recipes, collections, calorie pages) via the writer.
3. Add a seasonal collection page and link it from the home page during the season.

## internal-links: קישורים פנימיים ודפים יתומים (weekly)

1. Build the internal link graph from the production build (`.next` output or a local crawl of the sitemap).
2. Orphans (0–1 inbound links) and new pages from the last 2 weeks get links from 3+ relevant pages
   (same category, recipes that use the food, comparisons, lists).
3. Hubs (categories, collections, home) link to their top pages by search demand.
4. Vary anchors naturally; never stuff.

## tech-health: בריאות טכנית (weekly)

1. Crawl every URL in the sitemap: status codes, redirects, canonical, noindex where it should not be, titles and
   descriptions present and unique, H1 present, schema parses (JSON-LD), page weight.
2. Sitemap contains every indexable page and nothing else; `robots.txt` correct for the current launch state.
3. After launch: Core Web Vitals from GSC, Vercel runtime errors, GSC coverage ("Discovered/Crawled – not indexed").
4. Fix what is code-level in the PR; list the rest for the owner.

## indexing: אינדוקס דפים חדשים (weekly)

1. Pages added or changed since last run → submit via IndexNow (Bing, Yandex) and make sure they are in the sitemap
   with a fresh `lastmod`.
2. GSC: pages not indexed after 14 days → strengthen internal links to them, check for thin content or
   duplication; list them in the report.

## index-tiers: פתיחת דפים לגוגל לפי שכבות (weekly)

**Model:** every page has an index tier in the site data. Tier 1 = indexable (proven demand or unique content).
Tier 2 = live for visitors but `noindex` and left out of the sitemap. Tier 3 = not generated.
1. Promote tier 2 → tier 1 when the page got impressions in GSC (Google found it through links), earned an
   external link, or its target keyword now shows volume ≥ 50 in Ahrefs.
2. Widen the gate by site trust: when ≥ 80% of tier-1 pages are indexed (GSC) for 4 weeks in a row, promote the
   next batch of tier-2 pages (largest demand first, at most +20% of the indexed count per month).
3. Demote to tier 2 any tier-1 page with zero impressions for 120 days that is not a hub.
4. Never promote pages the reviewer flagged as thin. Record every promotion and demotion in the report.

## geo-visibility: נראות במנועי AI (every 2 weeks)

1. Ask each question in `site.json.geoQuestions` to ChatGPT, Gemini, Perplexity and Claude with web search
   (Lionet Pilot's GEO engine when connected, or Ahrefs Brand Radar).
2. Record: are we mentioned or cited, who is cited instead, what the answer says.
3. For questions where a competitor is cited and we are not: improve our page (direct answer in the first
   sentence, a clean table, the source named, an FAQ entry) and note it for the link plan.
**Output:** citation share over time (keep a running table in the report).

## geo-format: התאמת דפים לציטוט ב-AI (monthly)

1. Take the 30 highest-demand pages. Check each has: a one-sentence answer at the top, a data table with units,
   the source named on the page, an updated date, FAQ with JSON-LD, clear headings that are questions people ask.
2. Keep `llms.txt` current with the site's main sections and best pages.
3. Fix gaps through the writer and reviewer.

## competitor-watch: מעקב מתחרים (monthly)

1. Ahrefs organic keywords for each competitor in `site.json.competitors`, compared with last month
   (`date_compared`): new keywords they gained, new top pages.
2. New topics with demand that we lack → into the next opportunity report's writer queue.
3. Look for new competitors in the SERPs of our top queries; add them to `site.json`.

## link-plan: תוכנית קישורים חודשית (monthly, owner executes in iLINK)

1. Pick 10–20 target pages: high demand, positions 4–20, or pages that did not move after striking-distance work.
2. For each: suggested anchor (mix of exact, partial, branded and generic; no more than ~30% exact), suggested
   site types (food, health, parenting, lifestyle in Hebrew), priority.
3. Pace: steady monthly growth, never spikes. Track which links went live and the page's position after 4–8 weeks.
**Output:** a table the owner can hand to iLINK, added to the email.

## data-audit: בדיקת דיוק נתונים (monthly)

1. Random sample of 20 foods and 5 recipes. Re-check each against its source (USDA ndb, Tzameret when imported):
   right entry, right state (raw/cooked), servings realistic, recipe totals match ingredients.
2. Fix mapping errors through the writer and reviewer. Record the error rate in the report.

## monthly-report: דוח חודשי (monthly)

Email the owner one page: clicks, impressions and top queries (GSC), pages added, positions gained and lost,
GEO citation share, links built, revenue (once there is any), and the 3 priorities for next month.
Also update the board's `site/stats`.
