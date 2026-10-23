import json, re, sys
D="/tmp/claude-0/-home-claude/01f7055b-4b9a-5862-a030-58b897e76541/scratchpad/sr28/package/data/FOOD_DES.txt"
sr=json.load(open("/home/claude/data/sr28.json"))
rows=[]
for line in open(D,encoding="latin-1"):
    p=[x.strip("~") for x in line.rstrip("\r\n").split("^")]
    rows.append((p[0],p[1],p[2]))
BAD=re.compile(r"babyfood|infant|formula|pork|bacon|ham[ ,]|lard|kellogg|quaker|general mills|post,|nabisco|keebler|mcdonald|burger king|wendy|kfc|taco bell|pizza hut|subway|domino|papa john|denny|applebee|olive garden|chick-fil|popeyes|arby|dairy queen|sonic|carl|jack in|school lunch|usda commodity|alaska native|navajo|hopi|apache|shoshone|frybread|whale|seal|walrus|caribou|moose|elk|bear|beaver|squirrel|opossum|raccoon|muskrat|game meat|emu|ostrich|frog|turtle|snail|ready-to-heat|campbell|hormel|oscar mayer|kraft|archway|pepperidge|mars,|hershey|nestle|m&m|reese|snickers|kit kat|tootsie|starbursts|skittles|banquet|stouffer|lean cuisine|healthy choice|smart ones|gardenburger|morningstar|worthington|loma linda|tyson|perdue|swanson|chef boyardee|kashi|malt-o-meal|ralston|mother's|nature valley|special k|vitasoy|silk|blue diamond|light n fluffy|imitation|substitute|dehydrated|freeze-dried|meatless|w/ added|with added|fortified|reduced sodium|low sodium|no salt|unsalted|without salt|with salt|salt added|canned|frozen|mature seeds, raw|baby|fast foods|restaurant,|family style|chinese|mexican|latino|puerto|hawaiian|eskimo|pre-cooked|microwaved|heat|by-product|variety meats|separable fat|trimmed to 1/8|1/4\" fat|choice|select|prime|composite|retail cuts|all grades|wing,meat only|back,|neck|giblets|meat & skin & giblets|stewing|capons|roasting|light meat|dark meat|skin only|fryers,meat & skin|cornish|mechanically", re.I)
groups={"0100":"dairy","0200":"spices","0400":"fats","0500":"poultry","0600":"soups","0900":"fruits","1100":"veg","1200":"nuts","1300":"beef","1400":"drinks","1500":"fish","1600":"legumes","1700":"lamb","1800":"baked","1900":"sweets","2000":"grains","2500":"snacks","3500":"ethnic","2200":"meals","0800":"cereals"}
want=sys.argv[1]
out=[]
for ndb,g,desc in rows:
    if groups.get(g)!=want: continue
    if BAD.search(desc): continue
    f=sr.get(ndb)
    if not f or f["kcal"] is None: continue
    out.append(f"{ndb}|{desc}|{int(f['kcal'])}")
print(len(out), file=sys.stderr)
print("\n".join(out))
