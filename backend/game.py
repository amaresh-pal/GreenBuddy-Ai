"""Game rules: levels, missions, achievements, EcoWorld items, smart mission generator."""
import random, datetime as dt

LEVELS = [0, 60, 150, 300, 500, 800, 1200, 1700, 2300, 3000]
TITLES = ["Eco Rookie", "Green Sprout", "Seed Scout", "Tree Hugger", "Eco Warrior",
          "Climate Hero", "Green Guardian", "Earth Defender", "Eco Champion", "Planet Guardian"]
LEVEL_REWARD = {2: "oak", 3: "flowers", 4: "pond", 5: "butterflies"}  # free EcoWorld unlock per level


def m(id, title, desc, cat, diff, xp, coins, co2, when="any"):
    return dict(id=id, title=title, desc=desc, category=cat, difficulty=diff, xp=xp, coins=coins, co2=co2, when=when)


MISSIONS = [
    m("lights_off", "Lights Out", "Switch off lights and fans in every empty room today.", "energy", "easy", 20, 10, 0.4),
    m("standby_kill", "Vampire Slayer", "Unplug chargers, TV and other devices on standby.", "energy", "easy", 25, 12, 0.3),
    m("ac_24", "Cool Under 24", "Set your AC to 24-26°C and use a fan to circulate air.", "energy", "medium", 40, 20, 1.5, "hot"),
    m("curtains", "Sun Blocker", "Close curtains on sun-facing windows in the afternoon.", "energy", "easy", 20, 10, 0.8, "hot"),
    m("cold_wash", "Cold Wash Hero", "Run a full load of laundry in cold water.", "energy", "medium", 30, 15, 0.6),
    m("appliance_check", "Appliance Audit", "Find your 3 most power-hungry appliances and check their star ratings.", "energy", "medium", 45, 25, 1.0, "high_power"),
    m("short_shower", "5-Minute Shower", "Keep your shower under five minutes.", "water", "easy", 20, 10, 0.2),
    m("leak_hunter", "Leak Hunter", "Check taps and pipes for leaks and fix or report one.", "water", "medium", 35, 18, 0.3),
    m("rain_harvest", "Rain Catcher", "Collect rainwater in a bucket for plants or cleaning.", "water", "medium", 40, 20, 0.2, "rain"),
    m("bring_bag", "Bring Your Own Bag", "Carry a cloth bag so you refuse every plastic bag today.", "waste", "easy", 20, 10, 0.1),
    m("refill", "Refill, Don't Buy", "Carry a reusable bottle instead of buying bottled water.", "waste", "easy", 20, 10, 0.15),
    m("segregate", "Waste Sorter", "Separate dry and wet waste at home.", "waste", "medium", 30, 15, 0.3),
    m("walk_trip", "Walk It Out", "Walk or cycle for one trip under 2 km.", "transport", "medium", 40, 20, 0.5, "mild"),
    m("public_ride", "Public Hero", "Take a bus, metro or train instead of a private vehicle.", "transport", "medium", 50, 25, 2.0),
    m("carpool", "Pool Party", "Share a ride with a friend or colleague.", "transport", "medium", 45, 22, 1.8),
    m("veg_meal", "Plant Plate", "Eat one fully vegetarian meal today.", "food", "easy", 30, 15, 1.5),
    m("fresh_start", "Tiny Step", "Do just one green action: switch off one unused light.", "energy", "easy", 10, 5, 0.1, "comeback"),
]

A = lambda id, title, desc, emoji, type_, **kw: dict(id=id, title=title, desc=desc, emoji=emoji, type=type_, xp=30, coins=15, **kw)
ACHIEVEMENTS = [
    A("first_step", "First Step", "Complete your first mission", "🌱", "total", goal=1),
    A("energy_saver", "Energy Saver", "Complete 5 energy missions", "⚡", "category", category="energy", goal=5),
    A("water_warrior", "Water Warrior", "Complete 5 water missions", "💧", "category", category="water", goal=5),
    A("plastic_free", "Plastic-Free Hero", "Complete 5 waste missions", "♻️", "category", category="waste", goal=5),
    A("solar_explorer", "Solar Explorer", "Try the rooftop solar estimator", "☀️", "flag", flag="solar_used"),
    A("streak_7", "Seven-Day Green Streak", "Keep a 7-day streak", "🔥", "streak", goal=7),
    A("boss_slayer", "Titan Slayer", "Defeat the weekly boss", "🏆", "flag", flag="boss_defeated"),
    A("rising_star", "Rising Star", "Reach level 5", "⭐", "level", goal=5),
]

ITEMS = [
    dict(id="sapling", name="Sapling", emoji="🌱", price=0, min_level=1, start=True),
    dict(id="oak", name="Oak Tree", emoji="🌳", price=0, reward_level=2),
    dict(id="flowers", name="Flower Garden", emoji="🌸", price=0, reward_level=3),
    dict(id="pond", name="Clean Pond", emoji="💧", price=0, reward_level=4),
    dict(id="butterflies", name="Butterflies", emoji="🦋", price=0, reward_level=5),
    dict(id="mango", name="Mango Tree", emoji="🥭", price=60, min_level=1),
    dict(id="solar_panel", name="Solar Panels", emoji="🔆", price=120, min_level=3),
    dict(id="wind_turbine", name="Wind Turbine", emoji="🌬️", price=200, min_level=4),
    dict(id="eco_house", name="Eco House", emoji="🏡", price=250, min_level=5),
]

BOSS = dict(id="carbon_titan", title="Boss: The Carbon Titan",
            desc="Complete 7 missions this week across at least 3 categories.",
            goal=7, min_categories=3, xp=150, coins=75)


def seed(db):
    for col, rows in (("missions", MISSIONS), ("achievements", ACHIEVEMENTS), ("ecoworld_items", ITEMS)):
        if not db.query(col, limit=1):
            for i, r in enumerate(rows):
                db.set(col, r["id"], {**r, "order": i})


def load_catalog(db):
    return {c: {d["id"]: d for d in db.query(c)} for c in ("missions", "achievements", "ecoworld_items")}


def level_info(xp):
    lvl = max(i + 1 for i, t in enumerate(LEVELS) if xp >= t)
    cur = LEVELS[lvl - 1]
    nxt = LEVELS[lvl] if lvl < len(LEVELS) else None
    return {"level": lvl, "title": TITLES[lvl - 1], "xp": xp, "level_start": cur, "next_at": nxt,
            "progress": 100 if nxt is None else int((xp - cur) / (nxt - cur) * 100)}


def greenness(xp):
    return round(min(1.0, 0.2 + xp / 600), 3)


def new_user(uid, name, college, now_iso):
    return ensure({"uid": uid, "name": name, "college": college, "xp": 0, "coins": 0, "level": 1, "streak": 0,
            "best_streak": 0, "last_active": None, "co2_saved": 0.0, "missions_completed": 0,
            "stats": {}, "inventory": ["sapling"], "achievements": [], "solar_used": False,
            "boss_defeated": False, "boss_claimed_week": None, "daily": None, "created_at": now_iso})


def boss_progress(completions):
    cats = {c["category"] for c in completions}
    n = len(completions)
    return {"count": n, "categories": len(cats),
            "defeated": n >= BOSS["goal"] and len(cats) >= BOSS["min_categories"]}


def check_achievements(user, catalog):
    out = []
    for a in catalog.values():
        if a["id"] in user["achievements"]:
            continue
        t = a["type"]
        ok = ((t == "total" and user["missions_completed"] >= a["goal"]) or
              (t == "category" and user["stats"].get(a["category"], 0) >= a["goal"]) or
              (t == "streak" and user["best_streak"] >= a["goal"]) or
              (t == "flag" and user.get(a["flag"])) or
              (t == "level" and level_info(user["xp"])["level"] >= a["goal"]))
        if ok:
            out.append(a)
    return out


def generate_daily(user, weather, missions, today, footprint=None):
    """Smart Mission Generator: rule-based, weather + habit aware (no external AI API needed)."""
    rng = random.Random(f"{user['uid']}-{today.isoformat()}")
    ids, reasons = [], {}

    def add(mid, why):
        if mid in missions and mid not in reasons and len(ids) < 3:
            ids.append(mid)
            reasons[mid] = why

    temp, cond = weather.get("temp", 30), weather.get("condition", "Clear").lower()
    last = user.get("last_active")
    if last and (today - dt.date.fromisoformat(last)).days > 1:
        add("fresh_start", "You missed a few days. Here's an easy one to restart your streak.")
    kwh = max(_num((footprint or {}).get("inputs", {}).get("electricity_kwh")), _num(user.get("calc_kwh")))
    if kwh >= 250:
        add("appliance_check", f"Your electricity use is high (about {round(kwh)} kWh/month). Find what's drawing the most.")
    if cond in ("rain", "drizzle", "thunderstorm"):
        add("rain_harvest", f"It's raining ({weather.get('description')}), so catch some free water.")
    elif temp >= 32:
        add("ac_24", f"It's {temp}°C. Cooling is your biggest energy drain today.")
        add("curtains", f"{temp}°C outside: block the sun before it heats your room.")
    elif 18 <= temp <= 30:
        add("walk_trip", f"A pleasant {temp}°C. Great weather to walk or cycle.")
    pool = [k for k, v in missions.items() if v["when"] == "any" and k not in reasons]
    rng.shuffle(pool)
    for mid in pool:
        add(mid, "Today's pick to keep your green habits balanced.")
    return {"ids": ids, "reasons": reasons}


# ---------- social, themes, weekly competition, guides ----------
THEMES = [dict(id="meadow", name="Meadow", emoji="🌿", level=1), dict(id="sunset", name="Golden Hour", emoji="🌅", level=3),
          dict(id="ocean", name="Ocean Breeze", emoji="🌊", level=5), dict(id="night", name="Firefly Night", emoji="🌌", level=7)]
WEEKLY_PRIZES = {1: (100, 50), 2: (60, 30), 3: (40, 20)}  # rank -> (xp, coins) for last week's top 3
TEAM_GOAL_PER_MEMBER, TEAM_MIN_GOAL, TEAM_REWARD = 5, 10, (50, 25)


def _num(v):
    try:
        return float(v or 0)
    except (TypeError, ValueError):
        return 0.0


def slug(s):
    import re
    return re.sub(r"[^a-z0-9]+", "-", (s or "").lower()).strip("-")[:40]


def friend_code(uid):
    import hashlib
    return hashlib.sha1(uid.encode()).hexdigest()[:6].upper()


def ensure(u):
    """Fill in newer fields so older user documents keep working."""
    defaults = {"friends": [], "theme": "meadow", "weekly_claimed_week": None, "team_claimed_week": None,
                "calc_kwh": 0, "community_id": slug(u.get("college")),
                "level_history": [{"level": 1, "title": TITLES[0], "date": (u.get("created_at") or "")[:10]}]}
    for k, v in defaults.items():
        u.setdefault(k, v)
    u.setdefault("friend_code", friend_code(u["uid"]))
    return u


def _g(id, title, cat, summary, steps):
    return dict(id=id, title=title, category=cat, summary=summary, steps=steps)


GUIDES = [
    _g("ac", "Cooling without the huge bill", "energy", "Air conditioning is often the biggest electricity user in a hot-climate home.",
       ["Set the AC to 24-26°C and use a fan to spread the cool air.", "Clean or replace the filter every month or two.",
        "Close curtains on sun-facing windows and keep doors shut.", "Use a timer or sleep mode instead of running it all night."]),
    _g("led", "Lighting and standby power", "energy", "Small habits across the home add up.",
       ["Replace remaining bulbs and tubes with LEDs.", "Turn off lights and fans when you leave a room.",
        "Unplug chargers, TVs and set-top boxes, or use a switched power strip.", "Check BEE star ratings when buying appliances."]),
    _g("water", "Saving water at home", "water", "Most savings come from fixing leaks and changing a few routines.",
       ["Fix dripping taps; slow drips waste many litres a day.", "Keep showers short or use a bucket.",
        "Reuse rinse water for plants and mopping.", "Turn off the tap while brushing."]),
    _g("rain", "Rainwater harvesting basics", "water", "Capturing rain eases pressure on groundwater and mains supply.",
       ["Start small: place a clean bucket or drum under a downpipe.", "Use the water for plants and cleaning.",
        "For a building, ask a local plumber or your municipality about recharge pits and filters.", "Keep tanks covered to avoid mosquito breeding."]),
    _g("waste", "Waste: reduce, sort, reuse", "waste", "Sorting waste at the source makes recycling and composting possible.",
       ["Keep separate bins for wet (food) and dry (paper, plastic, metal) waste.", "Carry a cloth bag and a reusable bottle.",
        "Compost kitchen scraps if you have space.", "Hand dry recyclables to a local collector or recycler."]),
    _g("move", "Greener ways to travel", "transport", "Transport is usually the quickest area to cut emissions.",
       ["Walk or cycle for trips under 2 km.", "Use bus, metro or train for longer trips.", "Share rides with friends or colleagues.",
        "Keep tyres inflated and the vehicle serviced for better mileage."]),
    _g("food", "Eating lighter on the planet", "food", "Food emissions depend on what we eat and how much we waste.",
       ["Try more plant-based meals each week.", "Plan portions to reduce leftovers.", "Buy local, seasonal produce where you can.",
        "Cook with lids on to save LPG."]),
    _g("solar", "Thinking about rooftop solar", "energy", "Rooftop solar can cut bills over the long run, but needs planning.",
       ["Use the Solar tab here for a rough size and payback.", "Get at least two quotes and a site survey (shade, roof strength).",
        "Check current government subsidy schemes and net-metering rules with your electricity board.", "Prefer installers who offer warranty and service."]),
]
