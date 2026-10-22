import json, sys
src = sys.argv[1]; out = sys.argv[2]
cols = ["ndb","desc","water","kcal","protein","fat","ash","carbs","fiber","sugar","calcium","iron","magnesium","phosphorus","potassium","sodium","zinc","copper","manganese","selenium","vitC","thiamin","riboflavin","niacin","panto","vitB6","folate","folicAcid","foodFolate","folateDFE","choline","vitB12","vitA_IU","vitA_RAE","retinol","alphaCarot","betaCarot","betaCrypt","lycopene","lutZea","vitE","vitD_mcg","vitD_IU","vitK","satFat","monoFat","polyFat","cholesterol","gm1","gm1desc","gm2","gm2desc","refuse"]
foods = {}
with open(src, encoding="latin-1") as f:
    for line in f:
        parts = line.rstrip("\r\n").split("^")
        if len(parts) != len(cols): print("bad", len(parts), line[:60]); continue
        r = {}
        for c, v in zip(cols, parts):
            v = v.strip("~")
            if c in ("ndb","desc","gm1desc","gm2desc"): r[c] = v
            else: r[c] = float(v) if v != "" else None
        foods[r["ndb"]] = r
json.dump(foods, open(out,"w"), ensure_ascii=False)
print(len(foods))
