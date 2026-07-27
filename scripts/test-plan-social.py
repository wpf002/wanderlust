"""Comments + photo album: who can post, who can't, and cleanup."""
import json, sys, urllib.request, urllib.error, struct, zlib
B = (sys.argv[1] if len(sys.argv)>1 else "http://localhost:5001") + "/api"
ok=fail=0
def req(m,p,b=None,t=None,raw=None,ctype=None):
    if raw is not None: d=raw
    else: d=json.dumps(b).encode() if b is not None else None
    h={"Content-Type": ctype or "application/json"}
    if t: h["x-plan-token"]=t
    r=urllib.request.Request(B+p,data=d,method=m,headers=h)
    try:
        with urllib.request.urlopen(r) as f: return f.status, json.loads(f.read() or "{}")
    except urllib.error.HTTPError as e:
        body=e.read()
        try: return e.code, json.loads(body or "{}")
        except Exception: return e.code, {}
def check(l,g,w):
    global ok,fail
    if g==w: ok+=1; print(f"  ok    {l}")
    else: fail+=1; print(f"  FAIL  {l}: got {g!r}, want {w!r}")

def png(w=4,h=4):
    def chunk(t,d):
        c=t+d; return struct.pack(">I",len(d))+c+struct.pack(">I",zlib.crc32(c)&0xffffffff)
    ihdr=struct.pack(">IIBBBBB",w,h,8,2,0,0,0)
    raw=b"".join(b"\x00"+b"\xff\x00\x00"*w for _ in range(h))
    return b"\x89PNG\r\n\x1a\n"+chunk(b"IHDR",ihdr)+chunk(b"IDAT",zlib.compress(raw))+chunk(b"IEND",b"")

_,p = req("POST","/plans",{"templateId":"costa_rica","title":"Social test","ownerName":"Will"})
code=p["id"]; wt=p["token"]; wid=p["members"][0]["id"]
check("new plan has no comments", p["comments"], [])
check("new plan has no photos", p["photos"], [])

# --- comments: members ---
_,pl = req("POST",f"/plans/{code}/comments",{"body":"Who's booking the shuttle?"},t=wt)
check("member can post", len(pl["comments"]), 1)
cid = pl["comments"][0]["id"]
check("member comment attributed to member", pl["comments"][0]["memberId"], wid)
check("member comment has no visitor name", pl["comments"][0]["authorName"], None)
_,pl = req("POST",f"/plans/{code}/comments",{"body":"I've got it","parentId":cid},t=wt)
check("reply stores parent", pl["comments"][1]["parentId"], cid)

# --- comments: outsiders, unpublished vs published ---
s,_ = req("POST",f"/plans/{code}/comments",{"body":"hi","authorName":"Stranger"})
check("outsider blocked on unpublished trip -> 403", s, 403)
req("PATCH",f"/plans/{code}",{"isPublished":True},t=wt)
s,body = req("POST",f"/plans/{code}/comments",{"body":"hi"})
check("published trip still needs a name -> 400", s, 400)
s,pl = req("POST",f"/plans/{code}/comments",{"body":"How was Monteverde?","authorName":"Dana"})
check("visitor can ask on a published trip", s, 200)
visitor = [c for c in pl["comments"] if c["authorName"]=="Dana"][0]
check("visitor comment has no memberId", visitor["memberId"], None)
s,_ = req("DELETE",f"/plans/{code}/comments/{visitor['id']}")
check("visitor cannot delete -> 403", s, 403)
_,pl = req("DELETE",f"/plans/{code}/comments/{cid}",t=wt)
check("deleting a parent removes its reply too", len(pl["comments"]), 1)

# --- photos ---
s,_ = req("POST",f"/plans/{code}/photos",raw=png(),ctype="image/png")
check("photo upload without token -> 403", s, 403)
s,pl = req("POST",f"/plans/{code}/photos?caption=Sunset&day=2&w=4&h=4",raw=png(),ctype="image/png",t=wt)
check("member can upload", s, 200)
check("one photo stored", len(pl["photos"]), 1)
ph=pl["photos"][0]
check("photo attributed to uploader", ph["memberId"], wid)
check("caption stored", ph["caption"], "Sunset")
check("day stored", ph["dayNumber"], 2)
check("url points at /uploads", ph["url"].startswith("/uploads/"), True)
s,_ = req("POST",f"/plans/{code}/photos",raw=b"not an image",ctype="text/plain",t=wt)
check("non-image rejected", s in (415,400), True)

# the file is actually reachable
url = (sys.argv[1] if len(sys.argv)>1 else "http://localhost:5001") + ph["url"]
try:
    with urllib.request.urlopen(url) as f:
        served = f.status, f.headers.get("Content-Type")
except urllib.error.HTTPError as e: served = e.code, None
check("uploaded file is served", served[0], 200)

_,pl = req("PATCH",f"/plans/{code}/photos/{ph['id']}",{"caption":"Golden hour"},t=wt)
check("caption edited", pl["photos"][0]["caption"], "Golden hour")
_,pl = req("DELETE",f"/plans/{code}/photos/{ph['id']}",t=wt)
check("photo deleted", len(pl["photos"]), 0)
try:
    with urllib.request.urlopen(url) as f: gone=f.status
except urllib.error.HTTPError as e: gone=e.code
check("file removed from disk too", gone, 404)

# discover advertises the group space
_,d = req("GET","/discover")
mine=[x for x in d if x["id"]==code]
check("published plan on discover", len(mine), 1)
check("discover reports comment count", mine[0]["commentCount"], 1)
check("discover has photo count field", "photoCount" in mine[0], True)
check("discover has cover field", "coverUrl" in mine[0], True)

req("PATCH",f"/plans/{code}",{"isPublished":False},t=wt)
print(f"\n{ok} passed, {fail} failed")
sys.exit(1 if fail else 0)
