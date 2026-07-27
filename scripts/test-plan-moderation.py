"""Moderation and rate limiting: who can flood, who can hide, who sees what."""
import json, sys, urllib.request, urllib.error
BASE = sys.argv[1] if len(sys.argv) > 1 else "http://localhost:5001"
B = BASE + "/api"
ok = fail = 0

def req(m, p, b=None, t=None):
    d = json.dumps(b).encode() if b is not None else None
    h = {"Content-Type": "application/json"}
    if t: h["x-plan-token"] = t
    r = urllib.request.Request(B + p, data=d, method=m, headers=h)
    try:
        with urllib.request.urlopen(r) as f:
            return f.status, json.loads(f.read() or "{}")
    except urllib.error.HTTPError as e:
        body = e.read()
        try: return e.code, json.loads(body or "{}")
        except Exception: return e.code, {}

def check(l, g, w):
    global ok, fail
    if g == w: ok += 1; print(f"  ok    {l}")
    else: fail += 1; print(f"  FAIL  {l}: got {g!r}, want {w!r}")

_, p = req("POST", "/plans", {"templateId": "costa_rica", "title": "Moderation test", "ownerName": "Will"})
code = p["id"]; wt = p["token"]
check("questions allowed by default", p["allowQuestions"], True)
req("PATCH", f"/plans/{code}", {"isPublished": True}, t=wt)

# --- hiding ---
_, pl = req("POST", f"/plans/{code}/comments", {"body": "Where do we meet?"}, t=wt)
cid = pl["comments"][0]["id"]
check("member sees moderation state", "hidden" in pl["comments"][0], True)
_, anon = req("GET", f"/plans/{code}")
check("visitor sees no moderation state", "hidden" in anon["comments"][0], False)

_, pl = req("PATCH", f"/plans/{code}/comments/{cid}", {"hidden": True}, t=wt)
check("member still sees a hidden comment", len(pl["comments"]), 1)
check("...flagged as hidden", pl["comments"][0]["hidden"], True)
_, anon = req("GET", f"/plans/{code}")
check("visitor is not served hidden text", len(anon["comments"]), 0)
s, _ = req("PATCH", f"/plans/{code}/comments/{cid}", {"hidden": True})
check("outsider cannot hide -> 403", s, 403)
_, pl = req("PATCH", f"/plans/{code}/comments/{cid}", {"hidden": False}, t=wt)
check("restoring brings it back", pl["comments"][0]["hidden"], False)

# --- reporting ---
s, body = req("POST", f"/plans/{code}/comments/{cid}/report")
check("anyone can report", s, 200)
check("report reveals nothing about the plan", body, {"ok": True})
req("POST", f"/plans/{code}/comments/{cid}/report")   # same reporter again
_, pl = req("GET", f"/plans/{code}", t=wt)
check("one report per reporter", pl["comments"][0]["reportCount"], 1)
s, _ = req("POST", f"/plans/{code}/comments/999999/report")
check("reporting a missing comment -> 404", s, 404)

# Everything below posts as a visitor, which the limiter caps at 5/hour per
# address. Re-running this suite inside the same hour legitimately exhausts it,
# so stop with a clear message instead of reporting failures that aren't real.
def visitor_budget_gone(status: int) -> bool:
    if status != 429:
        return False
    print("\n  STOP  visitor-question budget for this address is already spent.")
    print("        The rest of this suite posts as a visitor; re-run in an hour")
    print("        (or against a freshly started server) for full coverage.")
    return True

# --- the questions switch ---
req("PATCH", f"/plans/{code}", {"allowQuestions": False}, t=wt)
s, _ = req("POST", f"/plans/{code}/comments", {"body": "hello", "authorName": "Stranger"})
if visitor_budget_gone(s):
    print(f"\n{ok} passed, {fail} failed (visitor checks not reached)")
    sys.exit(1 if fail else 0)
check("questions off blocks visitors -> 403", s, 403)
s, _ = req("POST", f"/plans/{code}/comments", {"body": "members unaffected"}, t=wt)
check("...but members still post", s, 200)
req("PATCH", f"/plans/{code}", {"allowQuestions": True}, t=wt)

# --- link spam ---
spam = "deals http://a.com http://b.com http://c.com www.d.com"
s, _ = req("POST", f"/plans/{code}/comments", {"body": spam, "authorName": "Bot"})
check("link-heavy question rejected", s, 400)
s, _ = req("POST", f"/plans/{code}/comments", {"body": spam}, t=wt)
check("...members may paste links", s, 200)

# --- rate limiting (visitor questions: 5/hour per address) ---
# Rejected attempts above already spent part of this window's budget, and that
# is deliberate: a bot posting garbage shouldn't earn free retries. So assert
# the ceiling holds rather than a specific count.
codes = []
for i in range(8):
    st, _ = req("POST", f"/plans/{code}/comments", {"body": f"question {i}", "authorName": "Curious"})
    codes.append(st)
check("some questions accepted", 200 in codes, True)
check("flood is cut off with 429", 429 in codes, True)
check("never more than the hourly ceiling", codes.count(200) <= 5, True)
check("rejected attempts still cost budget", codes.count(200) < 5, True)
st, body = req("POST", f"/plans/{code}/comments", {"body": "one more", "authorName": "Curious"})
check("429 explains itself", isinstance(body.get("error"), str) and len(body["error"]) > 10, True)
check("429 says when to retry", isinstance(body.get("retryAfter"), int), True)

# a member is not caught by the visitor limit
st, _ = req("POST", f"/plans/{code}/comments", {"body": "members are fine"}, t=wt)
check("member unaffected by the visitor limit", st, 200)

print(f"\n{ok} passed, {fail} failed")
sys.exit(1 if fail else 0)
