"""
Seed a handful of published group plans so Discover isn't empty.

    python3 scripts/seed-discover.py http://localhost:5001
    python3 scripts/seed-discover.py https://your-app.up.railway.app

Re-running creates a second set rather than updating the first — the plans
live in the database, not in this file. Only run it against an empty feed.
"""
import json, sys, urllib.request, datetime

BASE = sys.argv[1].rstrip("/") + "/api"
TODAY = datetime.date(2026, 7, 24)


def req(method, path, body=None):
    data = json.dumps(body).encode() if body is not None else None
    r = urllib.request.Request(
        BASE + path, data=data, method=method,
        headers={"Content-Type": "application/json"},
    )
    with urllib.request.urlopen(r) as f:
        return json.loads(f.read() or "{}")


def days_from(start, n):
    return [(start + datetime.timedelta(days=i)).isoformat() for i in range(n)]


PLANS = [
    dict(
        template="japan_highlights", length=10,
        title="Japan, 10 days, nothing wasted",
        blurb="Two cities, one bullet train, and a group chat that finally agreed on something.",
        settings={"budget": "midrange", "travelers": 4, "flightCost": 1100},
        members=["Will", "Sarah", "Marcus", "Priya"],
        start=datetime.date(2026, 10, 3),
        todos=[("Book flights", "transport"), ("Reserve the ryokan in Hakone", "lodging"),
               ("Get IC cards sorted", "transport"), ("Kyoto dinner reservation", "food")],
        expenses=[("Airbnb in Shinjuku", 1240.0, "lodging"), ("Shinkansen tickets", 520.0, "transport")],
    ),
    dict(
        template="portugal_coast", length=10,
        title="Lisbon to the Algarve on a budget",
        blurb="Ten days, four of us, under $1.5k each with flights. Surf lessons included.",
        settings={"budget": "budget", "travelers": 4, "flightCost": 600},
        members=["Dana", "Theo", "Ruby", "Sam"],
        start=datetime.date(2026, 9, 12),
        todos=[("Book the Lagos hostel", "lodging"), ("Rent the car in Lisbon", "transport"),
               ("Book surf lessons in Sagres", "activity")],
        expenses=[("Hostel deposits", 480.0, "lodging"), ("Rental car", 310.0, "transport")],
    ),
    dict(
        template="costa_rica", length=9,
        title="Volcano, cloud forest, then surf",
        blurb="Hot springs in La Fortuna, a night in the canopy, then nothing but beach.",
        settings={"budget": "midrange", "travelers": 2, "flightCost": 550},
        members=["Nina", "Alex"],
        start=datetime.date(2027, 1, 16),
        todos=[("Book the La Fortuna cabins", "lodging"), ("Reserve the hanging-bridges tour", "activity"),
               ("Shuttle to Santa Teresa", "transport")],
        expenses=[("Cabins in La Fortuna", 420.0, "lodging")],
    ),
    dict(
        template="paris_france", length=7,
        title="Paris for a long week",
        blurb="Wine bars over landmarks. Three museums max, and one very slow morning at the flea market.",
        settings={"budget": "midrange", "travelers": 2, "flightCost": 700},
        members=["Jules", "Maya"],
        start=datetime.date(2026, 11, 7),
        todos=[("Book the Marais apartment", "lodging"), ("Versailles tickets", "activity"),
               ("Reserve the Sunday lunch", "food")],
        expenses=[("Apartment, 6 nights", 980.0, "lodging")],
    ),
    dict(
        template="pacific_coast", length=9,
        title="PCH with the roommates",
        blurb="LA to Seattle in a rented van, splitting gas four ways and sleeping cheap.",
        settings={"budget": "budget", "travelers": 4, "mpg": 22},
        members=["Cam", "Bea", "Ollie", "Tess"],
        start=datetime.date(2026, 8, 22),
        todos=[("Reserve the van", "transport"), ("Book Big Sur campsite", "lodging"),
               ("Build the driving playlist", "other")],
        expenses=[("Van rental deposit", 640.0, "transport"), ("First tank of gas", 88.5, "transport")],
    ),
    dict(
        template="scotland_ireland", length=12,
        title="Highlands and Dublin, 12 days",
        blurb="Castles, cliffs, and a whisky budget we'll be defending to our accountants.",
        settings={"budget": "midrange", "travelers": 3, "flightCost": 850},
        members=["Rowan", "Iris", "Finn"],
        start=datetime.date(2027, 3, 6),
        todos=[("Book the Edinburgh flat", "lodging"), ("Ferry to Belfast", "transport"),
               ("Distillery tour on Islay", "activity"), ("Dublin last night — somewhere good", "food")],
        expenses=[("Edinburgh flat", 720.0, "lodging")],
    ),
]

created = []
for spec in PLANS:
    plan = req("POST", "/plans", {
        "templateId": spec["template"],
        "title": spec["title"],
        "ownerName": spec["members"][0],
        "settings": spec["settings"],
    })
    code = plan["id"]
    ids = [plan["members"][0]["id"]]
    for name in spec["members"][1:]:
        ids.append(req("POST", f"/plans/{code}/members", {"name": name})["member"]["id"])

    # Everyone free across the locked window, with a little slack on each side.
    window = days_from(spec["start"] - datetime.timedelta(days=2), spec["length"] + 4)
    for i, mid in enumerate(ids):
        # Stagger slightly so the grid shows real per-person dots, not a solid block.
        req("PUT", f"/plans/{code}/availability/{mid}", {"days": window[i % 2:]})

    for i, (label, cat) in enumerate(spec["todos"]):
        req("POST", f"/plans/{code}/assignments", {
            "label": label, "category": cat,
            "assigneeId": ids[i % len(ids)] if i < len(ids) else None,
        })

    for i, (desc, amt, cat) in enumerate(spec["expenses"]):
        req("POST", f"/plans/{code}/expenses", {
            "payerId": ids[i % len(ids)], "description": desc,
            "amount": amt, "splitIds": ids, "category": cat,
        })

    req("PATCH", f"/plans/{code}", {"startDate": spec["start"].isoformat()})
    req("PATCH", f"/plans/{code}", {"isPublished": True, "blurb": spec["blurb"]})
    created.append((code, spec["title"]))
    print(f"  {code}  {spec['title']}")

print(f"\nSeeded {len(created)} published plans.")
