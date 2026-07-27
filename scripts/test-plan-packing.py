import json, sys, urllib.request, urllib.error
B = (sys.argv[1] if len(sys.argv)>1 else "http://localhost:5001") + "/api"
ok=fail=0
def req(m,p,b=None,t=None):
    d=json.dumps(b).encode() if b is not None else None
    h={"Content-Type":"application/json"}
    if t: h["x-plan-token"]=t
    r=urllib.request.Request(B+p,data=d,method=m,headers=h)
    try:
        with urllib.request.urlopen(r) as f: return f.status, json.loads(f.read() or "{}")
    except urllib.error.HTTPError as e: return e.code, json.loads(e.read() or "{}")
def check(l,g,w):
    global ok,fail
    if g==w: ok+=1; print(f"  ok    {l}")
    else: fail+=1; print(f"  FAIL  {l}: got {g}, want {w}")

_,p = req("POST","/plans",{"templateId":"costa_rica","title":"Packing test","ownerName":"Will"})
code=p["id"]; wt=p["token"]; wid=p["members"][0]["id"]
_,j = req("POST",f"/plans/{code}/members",{"name":"Nina"}); nt=j["token"]; nid=j["member"]["id"]

check("new plan has empty packing", p["packing"], [])
# seed
_,pl = req("POST",f"/plans/{code}/packing/seed",{"items":[
    {"label":"Passport","category":"Documents"},
    {"label":"Sunscreen","category":"Toiletries"},
    {"label":"Cooler","category":"Gear","shared":True}]},t=wt)
check("seeded 3 items", len(pl["packing"]), 3)
# dedupe
_,pl = req("POST",f"/plans/{code}/packing/seed",{"items":[{"label":"passport","category":"Documents"}]},t=wt)
check("seed skips duplicate label (case-insensitive)", len(pl["packing"]), 3)

items={i["label"]:i for i in pl["packing"]}
check("shared flag stored", items["Cooler"]["shared"], True)
check("personal flag stored", items["Passport"]["shared"], False)

# writes need a token
s,_ = req("POST",f"/plans/{code}/packing",{"label":"Hat"})
check("add without token -> 403", s, 403)
s,_ = req("PUT",f"/plans/{code}/packing/{items['Passport']['id']}/check",{"checked":True})
check("check without token -> 403", s, 403)

# personal check is per-member
pid=items["Passport"]["id"]
_,pl = req("PUT",f"/plans/{code}/packing/{pid}/check",{"checked":True},t=wt)
got={i["id"]:i for i in pl["packing"]}[pid]
check("Will packed his passport", got["packedBy"], [wid])
_,pl = req("PUT",f"/plans/{code}/packing/{pid}/check",{"checked":True},t=nt)
got={i["id"]:i for i in pl["packing"]}[pid]
check("both packed theirs", sorted(got["packedBy"]), sorted([wid,nid]))
_,pl = req("PUT",f"/plans/{code}/packing/{pid}/check",{"checked":False},t=nt)
got={i["id"]:i for i in pl["packing"]}[pid]
check("Nina unpacked hers only", got["packedBy"], [wid])

# shared item: claim + done
cid=items["Cooler"]["id"]
_,pl = req("PATCH",f"/plans/{code}/packing/{cid}",{"claimedBy":nid,"done":True},t=wt)
got={i["id"]:i for i in pl["packing"]}[cid]
check("cooler claimed by Nina", got["claimedBy"], nid)
check("cooler marked packed", got["done"], True)

# delete cleans up checks
_,pl = req("DELETE",f"/plans/{code}/packing/{pid}",t=wt)
check("passport deleted", len([i for i in pl["packing"] if i["id"]==pid]), 0)
_,fresh = req("GET",f"/plans/{code}")
check("no orphan checks after delete", sum(len(i["packedBy"]) for i in fresh["packing"]), 0)

print(f"\n{ok} passed, {fail} failed")
sys.exit(1 if fail else 0)
