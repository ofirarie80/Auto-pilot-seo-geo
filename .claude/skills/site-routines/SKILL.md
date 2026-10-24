---
name: site-routines
description: Runs the recurring SEO and GEO routines for a site in the network (default sites/tzalachat) - finds which routines are due, runs each by its playbook, opens one PR, updates the control board and emails the owner. Use when the weekly routines task fires, or when asked to run a routine by name.
---

# Recurring SEO/GEO routines

Shared across every site in the network. Everything site-specific lives in `sites/<site>/site.json`,
`sites/<site>/CLAUDE.md` and `sites/<site>/ops/routines.json`. Default site: `tzalachat`.
The procedure for each routine is in `playbooks.md` next to this file. Read it before running a routine.

## 1. Decide what runs

1. Read `site.json` and `ops/routines.json`.
2. If the `ArtifactData` tool is available, read the `jobs` collection of `site.json.controlBoard`.
   A job with `status: "paused"` is skipped even if due.
3. Work out which requirements are met:
   - `ahrefs`: the Ahrefs tools are available and have units left.
   - `launch`: the site is indexable. True when `site.json.domain` is set and the production deployment has
     `indexableEnv` = `true` (check the Vercel project env), or the board's `site/stats.indexable` is true.
   - `gsc`: Ahrefs Search Console tools return data for the domain (`gsc-keywords` with a small limit).
4. A routine runs when it is enabled, all its requirements are met, and `lastRun` is null or at least
   `every` days ago. If a person asked for a routine by name, run that one regardless of `lastRun`.
5. Cap a single run at the 5 most important due routines (order: content, optimize, technical, geo, research,
   links, quality, report). The rest wait for next week.

## 2. Run

- One branch for the whole run: `git fetch origin && git checkout -B routines/<site>/YYYY-MM-DD origin/<baseBranch>`.
- Run each due routine by its playbook. Content changes always go through the site's reviewer agent before commit,
  exactly like the weekly content run (max 2 fix rounds, revert what still fails).
- Each routine writes a short Hebrew report to `sites/<site>/ops/routines/YYYY-MM-DD-<routine-id>.md`:
  what was checked, what was found (with numbers), what was changed, what needs the owner.
- Set `lastRun` to today in `ops/routines.json` for every routine that ran.
- `tzalachat-weekly` is a routine too: run it through the `tzalachat-weekly` skill, on its own branch and PR.

## 3. Finish

1. `python3 -I sites/<site>/scripts/validate.py` and `npm run build` in the site folder must pass.
2. Commit, push, open one PR into `baseBranch` via REST
   (`gh api repos/<repo>/pulls -f base=... -f head=... -f title=... -F body=@file`). Never merge.
   If nothing changed except reports, commit the reports directly to `baseBranch` instead of a PR.
3. Control board (if `ArtifactData` is available): for each routine that ran, set `jobs/<routine-id>`
   `{lastRun, nextRun, lastResult}` and add `runs/r-YYYYMMDD-<routine-id>`
   `{job, date, status: "success" | "review" | "failed", summary, links}`. Owner decisions become `ideas`.
4. Email `site.json.ownerEmail` in Hebrew: subject `<site name>: שגרות השבוע`, one line per routine
   (finding + action), the PR link, and anything waiting for him (e.g. links to build in iLINK).

## Guardrails

- Never change indexing, domains, DNS or Vercel settings, and never merge. The owner launches and approves.
- Never copy competitor content. Ahrefs data about competitors is fine.
- Never rename an existing URL without adding a redirect in the same PR.
- If a routine fails, record it as `failed` with the reason and continue with the others.
