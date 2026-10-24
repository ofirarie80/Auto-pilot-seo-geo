---
name: tzalachat-weekly
description: Weekly content pipeline for the צלחת nutrition site - scout SEO opportunities, write new pages, review them independently, open a PR with a preview for the owner and email him. Use when the weekly scheduled task fires or when asked to "run the weekly content run".
---

# Weekly content run for צלחת

Work in the repo root. Site code is in `sites/tzalachat/`; read its `CLAUDE.md` first.
Nothing goes to the live site without the owner. You open a PR; he approves.

## Steps

0. **Check the switch.** If the `ArtifactData` tool is available, read `jobs/tzalachat-weekly` from
   https://claude.ai/artifact/DAg3AnVQY1bGqfEtYGjdd8. If `status` is `paused`, stop without doing anything.
   Otherwise add a `runs` doc `r-YYYYMMDD` `{job: "tzalachat-weekly", date, status: "running", summary: "רצה עכשיו"}`.

1. **Branch.** `git fetch origin && git checkout -B content/YYYY-MM-DD origin/site/tzalachat` (today's date).
   `cd sites/tzalachat && npm ci` if `node_modules` is missing.
2. **Scout.** Run the `tzalachat-opportunities` agent. Wait for its report path and writer queue.
3. **Write.** Run the `tzalachat-writer` agent on the top 5 writer-queue items (or the number the person asked for).
4. **Review.** Run the `tzalachat-reviewer` agent (a fresh agent, not the writer).
   - FIX → send the reviewer's report to the writer agent, then review again with a fresh reviewer.
   - At most 2 fix rounds. Anything still failing is reverted (`git checkout -- <file>` for that item, or remove
     the entry) and listed as "נדחה" in the summary. Re-run `validate.py` and `npm run build` after reverting.
5. **Commit and PR.** Commit data changes plus `ops/` reports with message
   `tzalachat: weekly content YYYY-MM-DD (<n> new pages)`. Push the branch and open a PR into `site/tzalachat`
   with the REST API (GraphQL, and so `gh pr create`, is blocked in Claude Code sessions):
   `gh api repos/ofirarie80/Auto-pilot-seo-geo/pulls -f base=site/tzalachat -f head=<branch> -f title=... -F body=@<file>`. PR body in Hebrew: the items built (type, name, path, keyword, volume), items rejected,
   and the "דורש פיתוח או החלטה" table. Vercel posts a preview link on the PR; or list the Vercel
   project's deployments for that branch (project `tzalachat`) and use its branch alias
   `tzalachat-git-<branch-with-slashes-as-dashes>-ofirarie80-3839s-projects.vercel.app`.
   Never merge the PR yourself.
6. **Control board.** If the `ArtifactData` tool is available, add each "דורש פיתוח או החלטה" row as an idea in
   https://claude.ai/artifact/DAg3AnVQY1bGqfEtYGjdd8: collection `ideas`, doc id `w-YYYYMMDD-<n>`,
   `{title, world, priority: "mid", status: "idea", author: "claude", note, createdAt}` where `world` is one of
   foods, recipes, collections, tools, products, diets, health, compare, kitchen, geo, app, trainers.
   Then update the run: `runs/r-YYYYMMDD` → `{status: "review" (PR waiting) | "failed", summary (one Hebrew line:
   what was built, what the review caught), links: [{label: "PR", url}, {label: "תצוגה מקדימה", url}]}` and
   `jobs/tzalachat-weekly` → `{lastRun: <now ISO>, nextRun: <next Sunday 08:43 Asia/Jerusalem as ISO>, lastResult}`.
   Skip silently if the tool is not available.
7. **Email the owner** (ofirarie80@gmail.com) with the Gmail tool, in Hebrew, short:
   subject `צלחת: <n> דפים חדשים מחכים לאישור`; body: 3–5 lines of findings, the list of new pages with preview
   links, the PR link, and "לאישור: לכתוב לי 'מאשר' או למזג את ה-PR". If the run failed, email what failed instead.

## If something breaks

- Ahrefs unavailable or out of units: skip scouting and build from the most recent report's unbuilt items.
- Build fails and you cannot fix it in 2 attempts: do not push broken code; email the error.
- Never change `NEXT_PUBLIC_INDEXABLE`, domains, Vercel settings or the production branch.
