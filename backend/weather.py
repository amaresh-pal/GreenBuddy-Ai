import os, requests

URL = "https://api.openweathermap.org/data/2.5/weather"
DEMO = {
    "hot": dict(temp=35.0, condition="Clear", description="hot and sunny", humidity=55),
    "rain": dict(temp=26.0, condition="Rain", description="moderate rain", humidity=88),
    "mild": dict(temp=27.0, condition="Clouds", description="few clouds", humidity=60),
}


def _demo(kind, city, source="demo"):
    d = DEMO.get(kind, DEMO["hot"])
    return {**d, "city": city, "feels_like": d["temp"] + 2, "source": source}


def get_weather(city=None, lat=None, lon=None, demo=None):
    city = city or os.getenv("DEFAULT_CITY", "Chennai")
    if demo in DEMO:
        return _demo(demo, city)
    key = os.getenv("OPENWEATHER_API_KEY")
    if not key:
        return _demo("hot", city)
    params = {"appid": key, "units": "metric"}
    params.update({"lat": lat, "lon": lon} if lat and lon else {"q": city})
    try:
        r = requests.get(URL, params=params, timeout=6)
        r.raise_for_status()
        d = r.json()
        return {"city": d.get("name", city), "temp": round(d["main"]["temp"], 1),
                "feels_like": round(d["main"]["feels_like"], 1), "humidity": d["main"]["humidity"],
                "condition": d["weather"][0]["main"], "description": d["weather"][0]["description"],
                "source": "openweather"}
    except Exception as e:  # noqa
        print("Weather fetch failed:", e)
        return _demo("hot", city, source="fallback")
