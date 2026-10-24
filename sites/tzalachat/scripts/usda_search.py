"""Search the bundled USDA SR28 database.

Usage: python3 -I scripts/usda_search.py "hummus" "chickpea&raw"
Terms joined with & must all appear. Prints ndb | description | kcal per 100 g | USDA household servings | already used by slug.
"""
import gzip, json, os, sys

HERE = os.path.dirname(os.path.abspath(__file__))
sr = json.load(gzip.open(os.path.join(HERE, "usda", "sr28.json.gz"), "rt"))
used = {f["ndb"]: f["slug"] for f in json.load(open(os.path.join(HERE, "..", "data", "foods.json")))["foods"]}
for q in sys.argv[1:]:
    terms = [t.strip().lower() for t in q.split("&")]
    hits = [r for r in sr.values() if all(t in r.get("long", r["desc"]).lower() for t in terms)]
    hits.sort(key=lambda r: len(r.get("long", "")))
    print(f"# {q}: {len(hits)} hits")
    for r in hits[:12]:
        print(f"  {r['ndb']} | {r.get('long', r['desc'])[:90]} | {r['kcal']} kcal | servings: {r.get('gm1desc')}={r.get('gm1')}g, {r.get('gm2desc')}={r.get('gm2')}g" + (f" | USED by {used[r['ndb']]}" if r["ndb"] in used else ""))
