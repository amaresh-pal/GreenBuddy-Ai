"""All numbers are ESTIMATES using rough emission factors (label them as such in the UI)."""
GRID = 0.71  # kg CO2 per kWh, approx. Indian grid average
TRANSPORT = {"car": 0.17, "two_wheeler": 0.05, "auto": 0.10, "bus": 0.09, "metro": 0.04, "walk_cycle": 0.0}  # kg/km
DIET = {"veg": 60, "mixed": 100, "nonveg": 150}  # kg CO2e / month, rough
LPG_PER_CYLINDER = 42  # 14.2 kg cylinder
INDIA_AVG_MONTH = 160  # ~1.9 t CO2/yr per person, rough


def num(v, hi=100000):
    try:
        return max(0.0, min(float(v), hi))
    except (TypeError, ValueError):
        return 0.0


def footprint(d):
    electricity = num(d.get("electricity_kwh")) * GRID
    transport = sum(num(d.get(f"{k}_km")) * f * 4.33 for k, f in TRANSPORT.items())  # km per week
    diet = DIET.get(d.get("diet"), DIET["mixed"])
    cooking = num(d.get("lpg_cylinders"), 10) * LPG_PER_CYLINDER
    total = electricity + transport + diet + cooking
    r = lambda x: round(x, 1)
    return {"electricity": r(electricity), "transport": r(transport), "diet": r(diet), "cooking": r(cooking),
            "total": r(total), "india_avg": INDIA_AVG_MONTH,
            "vs_avg_pct": round((total / INDIA_AVG_MONTH - 1) * 100)}


TIPS = {"ac": "Run it at 24-26°C with a fan; each degree higher saves ~6% power.",
        "fan": "Switch off fans in empty rooms; consider a 5-star BLDC fan.",
        "bulb": "Swap remaining bulbs for LEDs — about 80% less power.",
        "fridge": "Keep it away from the wall and defrost regularly.",
        "tv": "Unplug at the wall; standby still draws power.",
        "washing": "Use full loads and cold water."}


def electricity(appliances, tariff):
    tariff = num(tariff, 50) or 7.0
    rows = []
    for a in appliances[:20]:
        kwh = num(a.get("watts"), 10000) * num(a.get("hours"), 24) * num(a.get("qty"), 50) * 30 / 1000
        name = str(a.get("name", "Appliance"))[:30]
        tip = next((t for k, t in TIPS.items() if k in name.lower()), None)
        rows.append({"name": name, "kwh": round(kwh, 1), "cost": round(kwh * tariff), "tip": tip})
    rows.sort(key=lambda r: r["kwh"], reverse=True)
    total = sum(r["kwh"] for r in rows)
    return {"rows": rows, "total_kwh": round(total, 1), "monthly_cost": round(total * tariff),
            "co2_kg": round(total * GRID, 1), "top": rows[0] if rows else None}


def solar(roof_m2, sun_hours=5.5, tariff=7.0, cost_per_kw=55000):
    roof, sun = num(roof_m2, 5000), num(sun_hours, 12) or 5.5
    tariff, cpk = num(tariff, 50) or 7.0, num(cost_per_kw, 500000) or 55000
    kw = round(roof * 0.6 / 10, 2)  # 60% usable roof, ~10 m2 per kW
    kwh = kw * sun * 30 * 0.78  # 78% performance ratio
    saving, cost = kwh * tariff, kw * cpk
    co2_year = kwh * 12 * GRID
    return {"capacity_kw": kw, "monthly_kwh": round(kwh), "monthly_saving": round(saving), "install_cost": round(cost),
            "payback_years": round(cost / (saving * 12), 1) if saving else None,
            "co2_year_kg": round(co2_year), "trees_equivalent": round(co2_year / 21)}
