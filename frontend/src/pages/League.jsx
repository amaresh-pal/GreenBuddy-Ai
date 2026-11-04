import React, { useEffect, useState } from "react";
import { api } from "../api";
import { useGame } from "../GameContext";

const Board = ({ rows, empty }) => rows.length === 0 ? <p className="muted">{empty}</p> : (
  <table><thead><tr><th>#</th><th>Player</th><th>Level</th><th>XP</th></tr></thead>
    <tbody>{rows.map((p) => (
      <tr key={p.rank} className={p.you ? "you" : ""}>
        <td>{p.rank}</td><td>{p.name}{p.college && <small> · {p.college}</small>}</td><td>{p.level ? `${p.level} · ${p.title}` : "-"}</td><td>{p.xp}</td>
      </tr>))}</tbody></table>
);

export default function League() {
  const { me, setMe, apply } = useGame();
  const [tab, setTab] = useState("global");
  const [d, setD] = useState(null);
  const [msg, setMsg] = useState("");
  const [code, setCode] = useState("");
  const load = () => {
    setD(null);
    const p = tab === "weekly" ? api.weekly() : tab === "team" ? api.community() : api.leaderboard(tab);
    p.then(setD).catch((e) => setMsg(e.message));
  };
  useEffect(load, [tab]);
  const claim = async (fn) => { setMsg(""); try { apply(await fn()); load(); } catch (e) { setMsg(e.message); } };
  const addFriend = async () => {
    setMsg("");
    try { const r = await api.addFriend(code); setMe(r.me); setMsg(`You and ${r.friend} are now friends!`); setCode(""); load(); }
    catch (e) { setMsg(e.message); }
  };
  const c = d?.community;
  return (
    <div className="stack">
      <div className="row chips">
        {[["global", "Everyone"], ["friends", "Friends"], ["weekly", "Weekly"], ["team", "My team"]].map(([k, l]) => (
          <button key={k} className={`chip ${tab === k ? "on" : ""}`} onClick={() => { setMsg(""); setTab(k); }}>{l}</button>))}
      </div>
      {msg && <p className="why">{msg}</p>}
      {!d ? <p>Loading…</p> : tab === "global" ? (<>
        <section className="card"><h2>Community goal</h2>
          <p>{c.players} players have avoided about <b>{c.co2_saved} kg</b> CO₂ (estimate) of our {c.goal} kg goal.</p>
          <div className="bar"><div style={{ width: `${Math.min(100, (c.co2_saved / c.goal) * 100)}%` }} /></div></section>
        <section className="card"><h2>Green League</h2><Board rows={d.leaders} empty="No players yet." /></section>
        {d.colleges.length > 0 && <section className="card"><h2>Team standings</h2>
          {d.colleges.map((t, i) => <p key={t.college}>{i + 1}. <b>{t.college}</b> · {t.members} players · {t.xp} XP · {t.co2} kg CO₂</p>)}</section>}
      </>) : tab === "friends" ? (<>
        <section className="card"><h2>Friends</h2>
          <p>Your friend code: <span className="code">{me.user.friend_code}</span></p>
          <p className="muted small">Share it so friends can add you. Adding works both ways.</p>
          <div className="row"><input style={{ maxWidth: 160 }} placeholder="Friend's code" value={code} maxLength={6}
            onChange={(e) => setCode(e.target.value.toUpperCase())} /><button className="btn" disabled={code.length < 6} onClick={addFriend}>Add friend</button></div></section>
        <section className="card"><h2>Friends leaderboard</h2><Board rows={d.leaders} empty="Add a friend to start a private league." /></section>
      </>) : tab === "weekly" ? (<>
        <section className="card"><h2>This week ({d.week})</h2>
          <p className="muted small">Ranked by XP from missions since Monday. Top 3 each week win a prize you can claim next week:
            {" "}{Object.entries(d.prizes).map(([r, p]) => `#${r}: +${p.xp} XP, +${p.coins} 🪙`).join(" · ")}</p>
          <Board rows={d.this_week} empty="No missions completed this week yet." /></section>
        <section className="card"><h2>Last week's winners</h2>
          <Board rows={d.last_week} empty="No results from last week." />
          {d.prize && <p>You placed #{d.my_prev_rank}! Prize: +{d.prize.xp} XP, +{d.prize.coins} 🪙</p>}
          {d.can_claim && <button className="btn" onClick={() => claim(api.weeklyClaim)}>Claim prize</button>}</section>
      </>) : !c ? (
        <section className="card"><p>Set a college or neighbourhood on sign-up to join a team. Clear your browser's site data to re-register with one.</p></section>
      ) : (
        <section className="card"><h2>Team mission: {c.name}</h2>
          <p>{c.members} members have completed <b>{c.count}</b> of <b>{c.goal}</b> missions this week. Together you've avoided about {c.co2} kg CO₂ (estimate).</p>
          <div className="bar"><div style={{ width: `${Math.min(100, (c.count / c.goal) * 100)}%` }} /></div>
          <p className="muted small">Everyone in the team gets +{c.reward.xp} XP and +{c.reward.coins} 🪙 when the goal is reached.</p>
          {c.can_claim ? <button className="btn" onClick={() => claim(api.communityClaim)}>Claim team reward</button>
            : c.done && <b className="ok">Reward claimed ✓</b>}</section>
      )}
    </div>
  );
}
