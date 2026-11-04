import React, { useEffect, useState } from "react";
import { useGame } from "../GameContext";
import { api } from "../api";

export default function Rewards() {
  const { me, setMe } = useGame();
  const [badges, setBadges] = useState([]);
  const [shop, setShop] = useState([]);
  const [error, setError] = useState("");
  const load = () => { api.achievements().then(setBadges); api.shop().then(setShop); };
  useEffect(load, [me.user.xp]);
  const buy = async (id) => {
    setError("");
    try { const r = await api.buy(id); setMe(r.me); load(); } catch (e) { setError(e.message); }
  };
  const pick = async (id) => { setError(""); try { setMe((await api.setTheme(id)).me); } catch (e) { setError(e.message); } };
  return (
    <div className="stack">
      <section className="card hist">
        <h2>Level history</h2>
        {me.user.level_history.map((h) => <p key={h.level}>Level {h.level} · <b>{h.title}</b> <span className="muted">{h.date}</span></p>)}
      </section>
      <section className="card">
        <h2>Themes</h2>
        <div className="grid">
          {me.themes.map((t) => (
            <button key={t.id} disabled={t.locked} className={`badge theme-btn ${me.user.theme === t.id ? "on" : ""} ${t.locked ? "locked" : ""}`} onClick={() => pick(t.id)}>
              <span className="big">{t.emoji}</span><b>{t.name}</b><small>{t.locked ? `Unlocks at level ${t.level}` : me.user.theme === t.id ? "Active" : "Tap to use"}</small>
            </button>))}
        </div>
      </section>
      <section className="card">
        <h2>Badge cabinet</h2>
        <div className="grid">
          {badges.map((b) => (
            <div key={b.id} className={`badge ${b.earned ? "" : "locked"}`}>
              <span className="big">{b.emoji}</span><b>{b.title}</b><small>{b.desc}</small>
            </div>
          ))}
        </div>
      </section>
      <section className="card">
        <div className="row between"><h2>EcoCoin shop</h2><b>🪙 {me.user.coins}</b></div>
        <p className="muted small">Coins are in-game rewards only. They have no cash value.</p>
        {error && <p className="err">{error}</p>}
        <div className="grid">
          {shop.map((it) => (
            <div key={it.id} className="badge">
              <span className="big">{it.emoji}</span><b>{it.name}</b>
              {it.owned ? <small className="ok">Owned ✓</small>
                : it.locked_reason ? <small>{it.locked_reason}</small>
                : <button className="btn small" disabled={!it.can_buy} onClick={() => buy(it.id)}>Buy · {it.price} 🪙</button>}
            </div>
          ))}
        </div>
      </section>
    </div>
  );
}
