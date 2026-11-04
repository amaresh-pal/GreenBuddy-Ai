import React from "react";
import { Link } from "react-router-dom";
import { CAT } from "../theme";

export function XPBar({ level }) {
  return (
    <div>
      <div className="row between"><b>Level {level.level} · {level.title}</b>
        <span className="muted">{level.next_at ? `${level.xp} / ${level.next_at} XP` : `${level.xp} XP · max level`}</span></div>
      <div className="bar"><div style={{ width: `${level.progress}%` }} /></div>
    </div>
  );
}

export function BossCard({ boss }) {
  const pct = Math.min(100, (boss.count / boss.goal) * 100);
  return (
    <div className="card boss">
      <div className="row between"><h3>👹 {boss.title}</h3><span className="pill">+{boss.xp} XP · +{boss.coins} 🪙</span></div>
      <p className="muted">{boss.desc}</p>
      <div className="bar danger"><div style={{ width: `${pct}%` }} /></div>
      <p className="muted small">{boss.count}/{boss.goal} missions · {boss.categories}/{boss.min_categories} categories
        {boss.defeated && " · Defeated this week!"}</p>
    </div>
  );
}

export function MissionCard({ m, onDone, busy }) {
  const c = CAT[m.category];
  return (
    <div className={`card mission ${m.done ? "done" : ""}`} style={{ borderLeftColor: c.color }}>
      <div className="row between">
        <h3>{c.emoji} {m.title}</h3><span className="pill">{m.difficulty}</span>
      </div>
      <p>{m.desc}</p>
      <p className="why">Why today: {m.reason}</p>
      <div className="row between">
        <span className="rewards">+{m.xp} XP · +{m.coins} 🪙 · ~{m.co2} kg CO₂</span>
        {onDone && (m.done ? <b className="ok">Done ✓</b> :
          <button className="btn" disabled={busy} onClick={() => onDone(m.id)}>Complete</button>)}
      </div>
    </div>
  );
}

export function Celebration({ r, onClose }) {
  if (!r) return null;
  return (
    <div className="modal" onClick={onClose}>
      <div className="card pop" onClick={(e) => e.stopPropagation()}>
        <h2>{r.leveled_up ? `Level ${r.new_level}: ${r.new_title}!` : r.title || "Mission complete!"}</h2>
        {r.xp_gain != null && <p>+{r.xp_gain} XP · +{r.coin_gain} 🪙{r.streak ? ` · ${r.streak}-day streak 🔥` : ""}</p>}
        {r.new_items?.map((i) => <p key={i.id}>🎁 Unlocked for EcoWorld: <b>{i.emoji} {i.name}</b></p>)}
        {r.achievements?.map((a) => <p key={a.id}>{a.emoji} Badge earned: <b>{a.title}</b> (+{a.xp} XP)</p>)}
        {r.boss_defeated && <p>🏆 You defeated the Carbon Titan! Bonus rewards added.</p>}
        <div className="row"><button className="btn" onClick={onClose}>Keep going</button>
          {r.new_items?.length > 0 && <Link className="btn ghost" to="/world" onClick={onClose}>See my island</Link>}</div>
      </div>
    </div>
  );
}
