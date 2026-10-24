"""Merge the curated Hebrew food lists with USDA SR28 values and write the site's foods.json.

Validates: unique slugs, unique USDA ids, valid categories, existing USDA ids, servings present.
"""
import json, gzip, importlib.util, os

HERE = os.path.dirname(os.path.abspath(__file__))


def load(name, path):
    spec = importlib.util.spec_from_file_location(name, path)
    m = importlib.util.module_from_spec(spec)
    spec.loader.exec_module(m)
    return m


base = load("base", os.path.join(HERE, "foods_he.py"))
more = load("more", os.path.join(HERE, "foods_more.py"))
sr = json.load(gzip.open(os.path.join(HERE, "usda", "sr28.json.gz"), "rt"))
KEEP = ["water", "kcal", "protein", "fat", "carbs", "fiber", "sugar", "calcium", "iron", "magnesium", "phosphorus",
        "potassium", "sodium", "zinc", "vitC", "thiamin", "riboflavin", "niacin", "vitB6", "folateDFE", "vitB12",
        "vitA_RAE", "vitE", "vitD_mcg", "vitK", "satFat", "monoFat", "polyFat", "cholesterol"]
cats = dict(base.CATEGORIES)
cats.update(more.EXTRA_CATEGORIES)

out, seen, seen_ndb, errors = [], set(), {}, []
for slug, name, ndb, cat, servs, aliases in list(base.FOODS) + list(more.MORE):
    if slug in seen:
        errors.append(f"dup slug {slug}")
    if any(c in slug for c in "'\" ()"):
        errors.append(f"bad slug {slug}")
    if ndb in seen_ndb:
        errors.append(f"dup ndb {ndb}: {seen_ndb[ndb]} / {slug}")
    if cat not in cats:
        errors.append(f"bad cat {cat} {slug}")
    if ndb not in sr:
        errors.append(f"missing ndb {ndb} {slug}")
        continue
    if not servs:
        errors.append(f"no servings {slug}")
    seen.add(slug)
    seen_ndb[ndb] = slug
    r = sr[ndb]
    out.append({"slug": slug, "name": name, "ndb": ndb, "usda": r["desc"], "category": cat,
                "servings": [{"label": l, "g": g} for l, g in servs], "aliases": aliases,
                "n": {k: r[k] for k in KEEP}})

if errors:
    print("\n".join(errors))
    raise SystemExit(1)

catlist = [{"slug": k, "name": v[0], "emoji": v[1]} for k, v in cats.items()]
dst = os.path.join(HERE, "..", "data", "foods.json")
json.dump({"foods": out, "categories": catlist}, open(dst, "w"), ensure_ascii=False, separators=(",", ":"))
print(len(out), "foods", len(catlist), "categories")
