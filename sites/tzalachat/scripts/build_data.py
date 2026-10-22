import json, sys, importlib.util
spec = importlib.util.spec_from_file_location("m", "/home/claude/scripts/foods_he.py"); m = importlib.util.module_from_spec(spec); spec.loader.exec_module(m)
sr = json.load(open("/home/claude/data/sr28.json"))
KEEP = ["water","kcal","protein","fat","carbs","fiber","sugar","calcium","iron","magnesium","phosphorus","potassium","sodium","zinc","vitC","thiamin","riboflavin","niacin","vitB6","folateDFE","vitB12","vitA_RAE","vitE","vitD_mcg","vitK","satFat","monoFat","polyFat","cholesterol"]
out=[]; seen=set()
for slug,name,ndb,cat,servs,aliases in m.FOODS:
    assert slug not in seen, slug; seen.add(slug)
    assert "'" not in slug and " " not in slug, slug
    r = sr[ndb]
    out.append({"slug":slug,"name":name,"ndb":ndb,"usda":r["desc"],"category":cat,
      "servings":[{"label":l,"g":g} for l,g in servs],"aliases":aliases,
      "n":{k:r[k] for k in KEEP}})
cats=[{"slug":k,"name":v[0],"emoji":v[1]} for k,v in m.CATEGORIES.items()]
json.dump({"foods":out,"categories":cats}, open("/home/claude/site/data/foods.json","w"), ensure_ascii=False, indent=0)
print(len(out),"foods")
