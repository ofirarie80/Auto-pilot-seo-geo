import sys, json, re
D="/tmp/claude-0/-home-claude/01f7055b-4b9a-5862-a030-58b897e76541/scratchpad/sr28/package/data/FOOD_DES.txt"
sr=json.load(open("/home/claude/data/sr28.json"))
rows=[]
for line in open(D,encoding="latin-1"):
    p=[x.strip("~") for x in line.rstrip("\r\n").split("^")]
    rows.append((p[0],p[2]))
for pat in sys.stdin:
    pat=pat.strip()
    if not pat: continue
    terms=[t.strip().lower() for t in pat.split("&")]
    hits=[(n,d) for n,d in rows if all(t in d.lower() for t in terms)]
    hits.sort(key=lambda x: len(x[1]))
    print(f"# {pat}: "+" || ".join(f"{n} {d[:70]} [{int(sr[n]['kcal'] or 0)}]" for n,d in hits[:4]))
