# צלחת (tzalachat): instructions for every agent working on this site

Hebrew nutrition-values site. Next.js 15 App Router, fully static (SSG). Every page is generated from two
JSON files, so almost all content work means editing data, not pages.

## Where things live

| What | File | How to change |
|---|---|---|
| Foods (556) | `data/foods.json` (generated, never edit by hand) | Add a tuple to `scripts/foods_more.py` `MORE`, then `python3 -I scripts/build_data.py` |
| Recipes | `data/recipes.json` | Edit directly. Ingredients point at food slugs |
| Ranked lists ("מזונות עשירים ב...") | `lib/data.ts` `BASE_LISTS` | Add a `ListDef` |
| Comparisons ("X מול Y") | `lib/data.ts` `CURATED_PAIRS` | Add a pair of food slugs |
| Popular foods on home page | `lib/data.ts` `POPULAR` | |
| Calculators | `app/tools/*`, `components/*Calculator.tsx` | Code change, needs review |
| Work reports | `ops/opportunities/` (scout), `ops/runs/` (writer log), `ops/reviews/` (reviewer) | Written by the agents |

Food tuple: `("slug", "שם בעברית", "USDA ndb", "category", [("serving label", grams), ...], ["aliases"])`.
Categories: fruits, vegetables, bread, grains, dairy, meat, fish, legumes, nuts, fats, sweets, drinks, dishes, herbs.
Find USDA ids with `python3 -I scripts/usda_search.py "chickpea&cooked"`.

Recipe shape: `{slug, name, category, intro, servings, time (minutes), ingredients: [{food, g, label}], steps: [...], tags: [...]}`.
Recipe categories in use: ארוחה עיקרית, ארוחת בוקר, סלטים, אוכל רחוב, תוספות, רטבים וממרחים, משקאות, מרקים.
A new category (e.g. קינוחים) is fine when there are at least 3 recipes for it.
Tags in use: ללא גלוטן, טבעוני, צמחוני, עשיר בחלבון, דל קלוריות, דל פחמימות, עשיר בסיבים. Reuse these exact spellings.

## Hard rules

1. **Numbers come only from the data.** Every calorie or nutrient figure is computed from `foods.json`
   (USDA SR28). Never type a nutrition number from memory or from another site.
2. **No copying.** Never copy text, recipes, tables or numbers from competitors (foodsdictionary, etc.).
   Ahrefs data about which keywords they rank for is fine; their content is not.
3. **No kosher-breaking combos in one recipe** (meat with dairy). No pork or shellfish recipes.
4. **No medical claims.** No "cures", "prevents", "burns fat", weight-loss promises or dosing advice.
   Health context is general and points to a dietitian or doctor.
5. **Slugs** are Hebrew words joined by `-`, no quotes, brackets, spaces, `/`, `?` or `#`.
   Never rename an existing slug (it is a live URL).
6. **Before any commit**: `python3 -I scripts/build_data.py` (if foods changed), `python3 -I scripts/validate.py`,
   then `npm run build`. All three must pass.
7. Indexing stays off (`NEXT_PUBLIC_INDEXABLE` unset) until the owner says launch. Do not touch it.

## Hebrew style

- Plain, warm, everyday Hebrew. Short sentences. Address the reader in plural (מחממים, מוסיפים).
- Recipe intro: 1–2 sentences on what the dish is and why it works. No hype words (מושלם, מדהים, הכי טעים).
- Steps: one action per step, with time or a doneness cue ("עד שהבצל שקוף, כ-5 דקות").
- Ingredient label: household amount first ("2 כפות שמן זית"), grams go in `g`.
- Use ASCII hyphen in compounds (כ-5), en dash for ranges (6–8). No English unless it is a brand or unit.

## Content agents

Defined in `/.claude/agents/`: `tzalachat-opportunities` finds what to build, `tzalachat-writer` builds it,
`tzalachat-reviewer` checks it independently. The weekly pipeline is the `tzalachat-weekly` skill.
Control board (ideas and decisions, shared with the owner): https://claude.ai/artifact/DAg3AnVQY1bGqfEtYGjdd8
