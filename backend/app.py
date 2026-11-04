import os, re, datetime as dt
from zoneinfo import ZoneInfo
from flask import Flask, request, jsonify
from flask_cors import CORS
from dotenv import load_dotenv

load_dotenv(os.path.join(os.path.dirname(__file__), ".env"))
load_dotenv()
import store as store_mod, game, calculators as calc, weather as wx

app = Flask(__name__)
CORS(app)
TZ = ZoneInfo(os.getenv("APP_TZ", "Asia/Kolkata"))
db = store_mod.get_store()
game.seed(db)
CAT = game.load_catalog(db)
COMMUNITY_GOAL_KG = 500


def today(): return dt.datetime.now(TZ).date()
def week_key(d): y, w, _ = d.isocalendar(); return f"{y}-W{w:02d}"
def err(msg, code=400): return jsonify(error=msg), code


def current_user():
    uid = request.headers.get("X-User-Id", "").strip()
    if not (8 <= len(uid) <= 64):
        return None
    u = db.get("users", uid)
    if not u:
        u = game.new_user(uid, "Eco Hero", "", dt.datetime.now(TZ).isoformat())
        db.set("users", uid, u)
    return game.ensure(u) if u else None


def me_payload(u):
    t = today()
    comps = db.query("mission_completions", where={"uid": u["uid"], "week": week_key(t)})
    info = game.level_info(u["xp"])
    nxt = next(({"level": l, "item": CAT["ecoworld_items"][i]} for l, i in sorted(game.LEVEL_REWARD.items())
                if l > info["level"]), None)
    return {"user": u, "level": info, "greenness": game.greenness(u["xp"]), "next_unlock": nxt,
            "boss": {**game.BOSS, **game.boss_progress(comps)},
            "themes": [{**t, "locked": info["level"] < t["level"]} for t in game.THEMES],
            "done_today": [c["mission_id"] for c in comps if c["date"] == t.isoformat()]}


def settle(u, old_level):
    """After any XP change: grant badges, then free EcoWorld items for each new level."""
    new_ach = game.check_achievements(u, CAT["achievements"])
    for a in new_ach:
        u["xp"] += a["xp"]; u["coins"] += a["coins"]; u["achievements"].append(a["id"])
        db.set("user_achievements", f"{u['uid']}_{a['id']}",
               {"uid": u["uid"], "achievement_id": a["id"], "date": today().isoformat()})
    info = game.level_info(u["xp"])
    u["level"] = info["level"]
    new_items = []
    for lvl in range(old_level + 1, info["level"] + 1):
        u["level_history"].append({"level": lvl, "title": game.TITLES[lvl - 1], "date": today().isoformat()})
        iid = game.LEVEL_REWARD.get(lvl)
        if iid and iid not in u["inventory"]:
            u["inventory"].append(iid); new_items.append(CAT["ecoworld_items"][iid])
    return new_ach, new_items, info["level"] > old_level


def latest_footprint(uid):
    logs = sorted(db.query("footprint_logs", where={"uid": uid}), key=lambda l: l["date"])
    return logs[-1] if logs else None


@app.get("/api/health")
def health(): return jsonify(ok=True, store=db.kind)


@app.post("/api/users/init")
def init_user():
    b = request.get_json(silent=True) or {}
    uid = str(b.get("uid", "")).strip()
    if not 8 <= len(uid) <= 64: return err("Invalid user id")
    name = str(b.get("name", "")).strip()[:30] or "Eco Hero"
    college = str(b.get("college", "")).strip()[:50]
    u = db.get("users", uid) or game.new_user(uid, name, college, dt.datetime.now(TZ).isoformat())
    game.ensure(u)
    u["name"], u["college"], u["community_id"] = name, college, game.slug(college)
    cid = u["community_id"]
    if cid and not db.get("communities", cid):
        db.set("communities", cid, {"id": cid, "name": college, "goal_kg": COMMUNITY_GOAL_KG,
                                    "created_at": dt.datetime.now(TZ).isoformat()})
    db.set("users", uid, u)
    return jsonify(me_payload(u))


@app.get("/api/me")
def me():
    u = current_user()
    return jsonify(me_payload(u)) if u else err("Unknown user", 404)


@app.get("/api/weather")
def weather():
    a = request.args
    return jsonify(wx.get_weather(a.get("city"), a.get("lat"), a.get("lon"), a.get("demo")))


@app.get("/api/missions")
def missions():
    u = current_user()
    if not u: return err("Unknown user", 404)
    t, a = today(), request.args
    ts = t.isoformat()
    w = wx.get_weather(a.get("city"), a.get("lat"), a.get("lon"), a.get("demo"))
    done = {c["mission_id"] for c in db.query("mission_completions", where={"uid": u["uid"], "date": ts})}
    daily = u.get("daily") or {}
    if daily.get("date") != ts or ((a.get("demo") or a.get("lat")) and not done):  # re-roll until you complete one
        daily = {**game.generate_daily(u, w, CAT["missions"], t, latest_footprint(u["uid"])), "date": ts, "weather": w}
        u["daily"] = daily
        db.set("users", u["uid"], u)
    items = [{**CAT["missions"][i], "reason": daily["reasons"][i], "done": i in done} for i in daily["ids"]]
    return jsonify(weather=w, missions=items, boss=me_payload(u)["boss"])


@app.post("/api/missions/complete")
def complete():
    u = current_user()
    if not u: return err("Unknown user", 404)
    mid = (request.get_json(silent=True) or {}).get("mission_id")
    t = today(); ts = t.isoformat(); wk = week_key(t)
    daily = u.get("daily") or {}
    # Server-side validation: must be one of today's generated missions, once per day.
    if daily.get("date") != ts or mid not in daily.get("ids", []): return err("That mission isn't available today.")
    cid = f"{u['uid']}_{mid}_{ts}"
    if db.get("mission_completions", cid): return err("You already completed this mission today.", 409)
    ms = CAT["missions"][mid]
    last = u.get("last_active")
    if last == ts: streak = max(u["streak"], 1)
    elif last == (t - dt.timedelta(days=1)).isoformat(): streak = u["streak"] + 1
    else: streak = 1
    old_level = game.level_info(u["xp"])["level"]
    xp_gain, coin_gain = ms["xp"] + min(streak, 7) * 2, ms["coins"]  # streak bonus
    u.update(xp=u["xp"] + xp_gain, coins=u["coins"] + coin_gain, streak=streak,
             best_streak=max(u["best_streak"], streak), last_active=ts,
             co2_saved=round(u["co2_saved"] + ms["co2"], 2), missions_completed=u["missions_completed"] + 1)
    u["stats"][ms["category"]] = u["stats"].get(ms["category"], 0) + 1
    db.set("mission_completions", cid, {"uid": u["uid"], "mission_id": mid, "category": ms["category"],
                                         "community_id": u.get("community_id", ""),
                                         "date": ts, "week": wk, "xp": xp_gain, "coins": coin_gain, "status": "rewarded"})
    comps = db.query("mission_completions", where={"uid": u["uid"], "week": wk})
    boss_done = game.boss_progress(comps)["defeated"] and u.get("boss_claimed_week") != wk
    if boss_done:
        u["xp"] += game.BOSS["xp"]; u["coins"] += game.BOSS["coins"]
        u["boss_claimed_week"], u["boss_defeated"] = wk, True
    ach, items, leveled = settle(u, old_level)
    db.set("users", u["uid"], u)
    info = game.level_info(u["xp"])
    return jsonify(mission=ms, xp_gain=xp_gain, coin_gain=coin_gain, streak=streak, boss_defeated=boss_done,
                   leveled_up=leveled, new_level=info["level"], new_title=info["title"],
                   new_items=items, achievements=ach, me=me_payload(u))


@app.route("/api/footprint", methods=["GET", "POST"])
def footprint():
    u = current_user()
    if not u: return err("Unknown user", 404)
    nudge = None
    if request.method == "POST":
        inputs = request.get_json(silent=True) or {}
        ts = today().isoformat()
        db.set("footprint_logs", f"{u['uid']}_{ts}", {"uid": u["uid"], "date": ts, "inputs": inputs,
                                                       "result": calc.footprint(inputs)})
        nudge = maybe_nudge(u, calc.num(inputs.get("electricity_kwh")))
    logs = sorted(db.query("footprint_logs", where={"uid": u["uid"]}), key=lambda l: l["date"])[-12:]
    return jsonify(history=[{"date": l["date"], **l["result"]} for l in logs], latest=logs[-1] if logs else None, nudge=nudge)


@app.post("/api/tools/electricity")
def tool_electricity():
    b = request.get_json(silent=True) or {}
    res = calc.electricity(b.get("appliances", []), b.get("tariff", 7))
    u = current_user()
    return jsonify({**res, "nudge": maybe_nudge(u, res["total_kwh"]) if u else None})


@app.post("/api/tools/solar")
def tool_solar():
    u = current_user()
    if not u: return err("Unknown user", 404)
    b = request.get_json(silent=True) or {}
    result = calc.solar(b.get("roof_m2"), b.get("sun_hours", 5.5), b.get("tariff", 7), b.get("cost_per_kw", 55000))
    old = game.level_info(u["xp"])["level"]
    u["solar_used"] = True
    ach, items, _ = settle(u, old)
    db.set("users", u["uid"], u)
    return jsonify(result=result, achievements=ach, new_items=items, me=me_payload(u))


@app.get("/api/achievements")
def achievements():
    u = current_user()
    if not u: return err("Unknown user", 404)
    rows = sorted(CAT["achievements"].values(), key=lambda a: a["order"])
    return jsonify([{**a, "earned": a["id"] in u["achievements"]} for a in rows])


@app.get("/api/shop")
def shop():
    u = current_user()
    if not u: return err("Unknown user", 404)
    lvl, out = game.level_info(u["xp"])["level"], []
    for it in sorted(CAT["ecoworld_items"].values(), key=lambda i: i["order"]):
        owned = it["id"] in u["inventory"]
        lock = None
        if not owned:
            if it.get("reward_level"): lock = f"Free at level {it['reward_level']}"
            elif lvl < it.get("min_level", 1): lock = f"Reach level {it['min_level']}"
        out.append({**it, "owned": owned, "locked_reason": lock,
                    "can_buy": not owned and not lock and u["coins"] >= it["price"]})
    return jsonify(out)


@app.post("/api/shop/buy")
def buy():
    u = current_user()
    if not u: return err("Unknown user", 404)
    it = CAT["ecoworld_items"].get((request.get_json(silent=True) or {}).get("item_id"))
    lvl = game.level_info(u["xp"])["level"]
    if not it or it.get("reward_level") or it.get("start"): return err("That item can't be bought.")
    if it["id"] in u["inventory"]: return err("You already own this.", 409)
    if lvl < it.get("min_level", 1): return err(f"Reach level {it['min_level']} first.")
    if u["coins"] < it["price"]: return err("Not enough EcoCoins.")
    u["coins"] -= it["price"]; u["inventory"].append(it["id"])
    db.set("users", u["uid"], u)
    return jsonify(item=it, me=me_payload(u))


def maybe_nudge(u, kwh):
    """High electricity use -> inject the Appliance Audit mission into today's missions (if none done yet)."""
    u["calc_kwh"] = kwh
    d, ts = u.get("daily") or {}, today().isoformat()
    nudge = None
    if kwh >= 250 and d.get("date") == ts and "appliance_check" not in d.get("ids", []):
        if not db.query("mission_completions", where={"uid": u["uid"], "date": ts}):
            d.update(game.generate_daily(u, d.get("weather") or {"temp": 30, "condition": "Clear"}, CAT["missions"], today(), None))
            u["daily"] = d
            if "appliance_check" in d["ids"]:
                nudge = f"Your usage is high (about {round(kwh)} kWh/month), so today's missions now include Appliance Audit."
    db.set("users", u["uid"], u)
    return nudge


def reward_payload(u, old_level, title, xp, coins):
    ach, items, leveled = settle(u, old_level)
    db.set("users", u["uid"], u)
    info = game.level_info(u["xp"])
    return jsonify(title=title, xp_gain=xp, coin_gain=coins, leveled_up=leveled, new_level=info["level"],
                   new_title=info["title"], new_items=items, achievements=ach, me=me_payload(u))


@app.get("/api/guides")
def guides(): return jsonify(game.GUIDES)


@app.get("/api/leaderboard")
def leaderboard():
    u = current_user()
    scope = request.args.get("scope", "global")
    everyone = db.query("users")
    if scope == "friends" and u:
        ids = set(u["friends"]) | {u["uid"]}
        top = sorted([x for x in everyone if x["uid"] in ids], key=lambda x: -x["xp"])[:20]
    else:
        top = sorted(everyone, key=lambda x: -x["xp"])[:20]
    leaders = [{"rank": i + 1, "name": x["name"], "college": x.get("college", ""), "xp": x["xp"],
                "level": game.level_info(x["xp"])["level"], "title": game.level_info(x["xp"])["title"],
                "streak": x["streak"], "you": bool(u and x["uid"] == u["uid"])} for i, x in enumerate(top)]
    colleges = {}
    for x in everyone:
        cid = x.get("community_id") or game.slug(x.get("college"))
        if cid:
            c = colleges.setdefault(cid, {"college": x["college"], "members": 0, "xp": 0, "co2": 0})
            c["members"] += 1; c["xp"] += x["xp"]; c["co2"] = round(c["co2"] + x["co2_saved"], 1)
    return jsonify(leaders=leaders, colleges=sorted(colleges.values(), key=lambda c: -c["xp"])[:5], scope=scope,
                   community={"co2_saved": round(sum(x["co2_saved"] for x in everyone), 1),
                              "goal": COMMUNITY_GOAL_KG, "players": len(everyone)})


@app.post("/api/friends/add")
def add_friend():
    u = current_user()
    if not u: return err("Unknown user", 404)
    code = str((request.get_json(silent=True) or {}).get("code", "")).strip().upper()
    if code == u["friend_code"]: return err("That's your own code.")
    rows = db.query("users", where={"friend_code": code}) if code else []
    if not rows: return err("No player found with that code.", 404)
    f = game.ensure(rows[0])
    if f["uid"] not in u["friends"]: u["friends"].append(f["uid"])
    if u["uid"] not in f["friends"]: f["friends"].append(u["uid"])
    db.set("users", u["uid"], u); db.set("users", f["uid"], f)
    return jsonify(friend=f["name"], me=me_payload(u))


# ---- weekly competition: XP earned from missions this week; last week's top 3 can claim a prize ----
def week_totals(wk):
    totals = {}
    for c in db.query("mission_completions", where={"week": wk}):
        totals[c["uid"]] = totals.get(c["uid"], 0) + c.get("xp", 0)
    return sorted(totals.items(), key=lambda kv: -kv[1])


def weekly_rows(wk, n):
    rows, u = [], current_user()
    for i, (uid, xp) in enumerate(week_totals(wk)[:n]):
        x = db.get("users", uid)
        if x: rows.append({"rank": i + 1, "name": x["name"], "college": x.get("college", ""), "xp": xp, "you": bool(u and uid == u["uid"])})
    return rows


def prev_week(): return week_key(today() - dt.timedelta(days=7))


def my_prev_rank(uid):
    return next((i + 1 for i, (x, _) in enumerate(week_totals(prev_week())) if x == uid), None)


@app.get("/api/weekly")
def weekly():
    u = current_user()
    if not u: return err("Unknown user", 404)
    rank = my_prev_rank(u["uid"])
    prize = game.WEEKLY_PRIZES.get(rank)
    return jsonify(week=week_key(today()), this_week=weekly_rows(week_key(today()), 10), last_week=weekly_rows(prev_week(), 3),
                   my_prev_rank=rank, prize=prize and {"xp": prize[0], "coins": prize[1]},
                   can_claim=bool(prize) and u["weekly_claimed_week"] != prev_week(),
                   prizes={str(k): {"xp": v[0], "coins": v[1]} for k, v in game.WEEKLY_PRIZES.items()})


@app.post("/api/weekly/claim")
def weekly_claim():
    u = current_user()
    if not u: return err("Unknown user", 404)
    prize = game.WEEKLY_PRIZES.get(my_prev_rank(u["uid"]))
    if not prize or u["weekly_claimed_week"] == prev_week(): return err("No weekly prize to claim.")
    old = game.level_info(u["xp"])["level"]
    u["xp"] += prize[0]; u["coins"] += prize[1]; u["weekly_claimed_week"] = prev_week()
    return reward_payload(u, old, "Weekly Green League prize!", *prize)


# ---- teams (communities): everyone in the same college/neighbourhood shares a weekly mission goal ----
def community_state(u):
    cid = u.get("community_id")
    if not cid: return None
    wk = week_key(today())
    members = db.query("users", where={"community_id": cid})
    count = len(db.query("mission_completions", where={"community_id": cid, "week": wk}))
    goal = max(game.TEAM_MIN_GOAL, game.TEAM_GOAL_PER_MEMBER * len(members))
    return {"id": cid, "name": u["college"], "members": len(members), "count": count, "goal": goal,
            "done": count >= goal, "reward": {"xp": game.TEAM_REWARD[0], "coins": game.TEAM_REWARD[1]},
            "can_claim": count >= goal and u["team_claimed_week"] != wk,
            "co2": round(sum(m["co2_saved"] for m in members), 1)}


@app.get("/api/community")
def community():
    u = current_user()
    return jsonify(community=community_state(u)) if u else err("Unknown user", 404)


@app.post("/api/community/claim")
def community_claim():
    u = current_user()
    if not u: return err("Unknown user", 404)
    c = community_state(u)
    if not c or not c["can_claim"]: return err("Your team hasn't unlocked a reward yet.")
    old = game.level_info(u["xp"])["level"]
    u["xp"] += game.TEAM_REWARD[0]; u["coins"] += game.TEAM_REWARD[1]; u["team_claimed_week"] = week_key(today())
    return reward_payload(u, old, "Team mission complete!", *game.TEAM_REWARD)


@app.post("/api/theme")
def set_theme():
    u = current_user()
    if not u: return err("Unknown user", 404)
    t = next((x for x in game.THEMES if x["id"] == (request.get_json(silent=True) or {}).get("theme")), None)
    if not t: return err("Unknown theme.")
    if game.level_info(u["xp"])["level"] < t["level"]: return err(f"Reach level {t['level']} to unlock this theme.")
    u["theme"] = t["id"]
    db.set("users", u["uid"], u)
    return jsonify(me=me_payload(u))


if __name__ == "__main__":
    app.run(host="0.0.0.0", port=int(os.getenv("PORT", 5000)), debug=True)
