import React, { useEffect, useState } from "react";
import { useGame } from "../GameContext";
import { api } from "../api";
import { MissionCard, BossCard } from "../components/Bits";

export default function Missions() {
  const { complete } = useGame();
  const [data, setData] = useState(null);
  const [demo, setDemo] = useState("auto");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [loc, setLoc] = useState(null);
  const load = (d, l) => api.missions(d, l).then(setData).catch((e) => setError(e.message));
  useEffect(() => { load(demo, loc); }, [demo, loc]);

  const done = async (id) => {
    setBusy(true); setError("");
    try { await complete(id); await load(demo, loc); } catch (e) { setError(e.message); }
    setBusy(false);
  };
  const locate = () => navigator.geolocation
    ? navigator.geolocation.getCurrentPosition((p) => { setDemo("auto"); setLoc({ lat: p.coords.latitude, lon: p.coords.longitude }); },
        () => setError("Location permission was denied. Using the default city."))
    : setError("This browser can't share your location.");
  if (!data) return <p>{error || "Loading missions…"}</p>;
  const w = data.weather;
  return (
    <div className="stack">
      <section className="card">
        <h2>Mission Arena</h2>
        <p>Today in {w.city}: <b>{w.temp}°C</b>, {w.description}. Missions adapt to the weather and your habits.</p>
        <div className="row chips">
          <span className="muted small">Weather source: {w.source}. Demo weather:</span>
          <button className={`chip ${loc ? "on" : ""}`} onClick={locate}>📍 Use my location</button>
          {["auto", "hot", "rain", "mild"].map((k) => (
            <button key={k} className={`chip ${demo === k ? "on" : ""}`} onClick={() => setDemo(k)}>{k}</button>
          ))}
        </div>
      </section>
      {error && <p className="err">{error}</p>}
      {data.missions.map((m) => <MissionCard key={m.id} m={m} onDone={done} busy={busy} />)}
      <BossCard boss={data.boss} />
      <p className="muted small">Missions are self-reported. Honest play keeps the leaderboard fair.</p>
    </div>
  );
}
