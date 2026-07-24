"""Prove that writes need a valid member token and reads don't."""
import json, sys, urllib.request, urllib.error

BASE = (sys.argv[1] if len(sys.argv) > 1 else "http://localhost:5001") + "/api"
ok = fail = 0


def req(method, path, body=None, token=None):
    data = json.dumps(body).encode() if body is not None else None
    h = {"Content-Type": "application/json"}
    if token:
        h["x-plan-token"] = token
    r = urllib.request.Request(BASE + path, data=data, method=method, headers=h)
    try:
        with urllib.request.urlopen(r) as f:
            return f.status, json.loads(f.read() or "{}")
    except urllib.error.HTTPError as e:
        return e.code, json.loads(e.read() or "{}")


def check(label, got, want):
    global ok, fail
    if got == want:
        ok += 1
        print(f"  ok    {label}")
    else:
        fail += 1
        print(f"  FAIL  {label}: got {got}, want {want}")


# --- setup -----------------------------------------------------------------
status, plan = req("POST", "/plans", {"templateId": "japan_highlights",
                                      "title": "Token test", "ownerName": "Will"})
code = plan["id"]
will_token = plan.get("token")
will_id = plan["members"][0]["id"]
check("create returns a token", bool(will_token), True)
check("create's token is not in members", "token" in plan["members"][0], False)

status, joined = req("POST", f"/plans/{code}/members", {"name": "Sarah"})
sarah_token, sarah_id = joined.get("token"), joined["member"]["id"]
check("join returns a token", bool(sarah_token), True)

# --- reads stay open -------------------------------------------------------
status, got = req("GET", f"/plans/{code}")
check("GET plan without token", status, 200)
check("GET plan never leaks tokens", json.dumps(got).find("token"), -1)

# --- writes without a token are refused ------------------------------------
for label, method, path, body in [
    ("publish", "PATCH", f"/plans/{code}", {"isPublished": True}),
    ("remove member", "DELETE", f"/plans/{code}/members/{sarah_id}", None),
    ("set availability", "PUT", f"/plans/{code}/availability/{will_id}", {"days": ["2026-09-01"]}),
    ("add expense", "POST", f"/plans/{code}/expenses",
     {"payerId": will_id, "description": "x", "amount": 5, "splitIds": [will_id]}),
    ("add assignment", "POST", f"/plans/{code}/assignments", {"label": "x"}),
    ("post journal", "POST", f"/plans/{code}/journal", {"text": "x"}),
]:
    status, _ = req(method, path, body)
    check(f"{label} without token → 403", status, 403)

# --- a wrong token is refused too ------------------------------------------
status, _ = req("PATCH", f"/plans/{code}", {"isPublished": True}, token="not-a-real-token")
check("publish with a bogus token → 403", status, 403)

# --- a member's own token works --------------------------------------------
status, _ = req("POST", f"/plans/{code}/assignments", {"label": "Book flights"}, token=will_token)
check("add assignment with token → 200", status, 200)
status, _ = req("PUT", f"/plans/{code}/availability/{will_id}", {"days": ["2026-09-01"]}, token=will_token)
check("own availability with token → 200", status, 200)

# --- you can't answer the poll for someone else ----------------------------
status, _ = req("PUT", f"/plans/{code}/availability/{sarah_id}", {"days": ["2026-09-02"]}, token=will_token)
check("Will setting Sarah's dates → 403", status, 403)

# --- the journal author comes from the token, not the body -----------------
req("POST", f"/plans/{code}/journal", {"text": "hello", "memberId": sarah_id}, token=will_token)
status, got = req("GET", f"/plans/{code}")
check("journal author is the token holder", got["journal"][0]["memberId"], will_id)

# --- a claimed name can't be taken over ------------------------------------
status, body = req("POST", f"/plans/{code}/members", {"name": "Sarah"})
check("re-joining as Sarah → 409", status, 409)
status, body = req("POST", f"/plans/{code}/members", {"name": "sarah"})
check("re-joining as 'sarah' (case) → 409", status, 409)

# --- forking gives the forker their own token ------------------------------
req("PATCH", f"/plans/{code}", {"isPublished": True}, token=will_token)
status, forked = req("POST", f"/plans/{code}/fork", {"ownerName": "Dana"})
check("fork returns a token", bool(forked.get("token")), True)
status, _ = req("POST", f"/plans/{forked['id']}/assignments", {"label": "y"}, token=forked["token"])
check("forker can write to their copy", status, 200)
status, _ = req("POST", f"/plans/{forked['id']}/assignments", {"label": "y"}, token=will_token)
check("source token can't write to the fork", status, 403)

print(f"\n{ok} passed, {fail} failed")
sys.exit(1 if fail else 0)
