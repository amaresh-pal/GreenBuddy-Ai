import React, { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { useGame } from "../GameContext";
import { api } from "../api";
import EcoWorld from "../components/EcoWorld";
import { XPBar, BossCard } from "../components/Bits";
import { CAT } from "../theme";

export default function Dashboard() {
  const { me } = useGame();
  const [data, setData] = useState(null);
  useEffect(() => { api.missions().then(setData).catch(() => {}); }, [me.user.missions_completed]);
  const { user, level, greenness, boss, next_unlock } = me;
  return (
    <div className="stack">
      <section className="card hero">
        <div>
          <h1>Hi {user.name}, your island is {Math.round(greenness * 100)}% green</h1>
          <XPBar level={level} />
          {next_unlock && <p className="muted">Next unlock at level {next_unlock.level}: {next_unlock.item.emoji} {next_unlock.item.name}</p>}
          <p className="muted">Estimated CO₂ avoided so far: <b>{user.co2_saved} kg</b></p>
        </div>
        <EcoWorld greenness={greenness} inventory={user.inventory} level={level.level} />
      </section>
      <section className="card">
        <div className="row between"><h2>Today's missions</h2><Link to="/missions" className="btn ghost">Open Mission Arena</Link></div>
        {!data ? <p className="muted">Loading…</p> : data.missions.map((m) => (
          <p key={m.id} className={m.done ? "strike" : ""}>{CAT[m.category].emoji} {m.title} <span className="muted">· +{m.xp} XP</span></p>
        ))}
        {data && <p className="muted small">{data.weather.city}: {data.weather.temp}°C, {data.weather.description}</p>}
      </section>
      <BossCard boss={boss} />
    </div>
  );
}
