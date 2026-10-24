"""Validate site data. Exit code 1 on any error. Run before every commit.

Checks recipes (fields, unique slugs, ingredients point at real foods, sane grams, kcal per serving)
and foods (unique slugs, servings, kcal present).
"""
import json, os, re, sys

HERE = os.path.dirname(os.path.abspath(__file__))
D = os.path.join(HERE, "..", "data")
foods = json.load(open(os.path.join(D, "foods.json")))["foods"]
recipes = json.load(open(os.path.join(D, "recipes.json")))["recipes"]
by = {f["slug"]: f for f in foods}
err, warn = [], []

seen = set()
for f in foods:
    if f["slug"] in seen: err.append(f"food dup slug {f['slug']}")
    seen.add(f["slug"])
    if not f["servings"]: err.append(f"food {f['slug']} has no servings")
    if f["n"].get("kcal") is None: err.append(f"food {f['slug']} has no kcal")

REQ = ["slug", "name", "category", "intro", "servings", "time", "ingredients", "steps", "tags"]
seen = set()
for r in recipes:
    s = r.get("slug", "?")
    for k in REQ:
        if k not in r or r[k] in ("", [], None): err.append(f"recipe {s}: missing {k}")
    if s in seen: err.append(f"recipe dup slug {s}")
    seen.add(s)
    if re.search(r"[\"'() /?#]", s): err.append(f"recipe {s}: bad characters in slug")
    kcal = 0
    for i in r.get("ingredients", []):
        if i.get("food") not in by: err.append(f"recipe {s}: unknown food '{i.get('food')}'"); continue
        if not (0 < i.get("g", 0) <= 3000): err.append(f"recipe {s}: weird grams {i.get('g')} for {i['food']}")
        if not i.get("label"): err.append(f"recipe {s}: ingredient {i['food']} has no label")
        kcal += by[i["food"]]["n"]["kcal"] * i.get("g", 0) / 100
    sv = r.get("servings") or 1
    per = kcal / sv
    if not (30 <= per <= 1500): warn.append(f"recipe {s}: {per:.0f} kcal per serving looks off")
    if not (1 <= r.get("time", 0) <= 600): err.append(f"recipe {s}: time {r.get('time')} out of range")
    if not r.get("steps"): err.append(f"recipe {s}: no steps")

for w in warn: print("WARN", w)
for e in err: print("ERROR", e)
print(f"{len(foods)} foods, {len(recipes)} recipes, {len(err)} errors, {len(warn)} warnings")
sys.exit(1 if err else 0)
