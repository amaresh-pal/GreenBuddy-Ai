import React, { useEffect, useState } from "react";
import { api } from "../api";
import { useGame } from "../GameContext";

const Board = ({ rows = [], empty }) => (!rows || rows.length === 0) ? (
  <p className="muted">{empty}</p>
) : (
  <table>
    <thead>
      <tr><th>#</th><th>Player</th><th>Level</th><th>XP</th></tr>
    </thead>
    <tbody>
      {rows.map((p, idx) => (
        <tr key={p.rank || idx} className={p.you ? "you" : ""}>
          <td>{p.rank || idx + 1}</td>
          <td>{p.name}{p.college && <small> · {p.college}</small>}</td>
          <td>{p.level ? `${p.level} · ${p.title || ""}` : "-"}</td>
          <td>{p.xp ?? 0}</td>
        </tr>
      ))}
    </tbody>
  </table>
);

export default function League() {
  const { me, setMe, start, apply } = useGame();
  const [tab, setTab] = useState("global");
  const [d, setD] = useState(null);
  const [loading, setLoading] = useState(true);
  const [msg, setMsg] = useState("");
  const [code, setCode] = useState("");
  const [teamInput, setTeamInput] = useState("");
  const [teamUpdating, setTeamUpdating] = useState(false);

  const load = () => {
    setLoading(true);
    setMsg("");
    const p = tab === "weekly" ? api.weekly() : tab === "team" ? api.community() : api.leaderboard(tab);
    p.then((res) => {
      setD(res);
      setLoading(false);
    }).catch((e) => {
      setMsg(e.message || "Failed to load data.");
      setLoading(false);
    });
  };

  useEffect(() => {
    load();
  }, [tab]);

  const claim = async (fn) => {
    setMsg("");
    try {
      apply(await fn());
      load();
    } catch (e) {
      setMsg(e.message);
    }
  };

  const addFriend = async () => {
    setMsg("");
    try {
      const r = await api.addFriend(code);
      setMe(r.me);
      setMsg(`You and ${r.friend} are now friends!`);
      setCode("");
      load();
    } catch (e) {
      setMsg(e.message);
    }
  };

  const handleJoinTeam = async (nameToJoin) => {
    const val = (nameToJoin || teamInput).trim();
    if (!val) return;
    setTeamUpdating(true);
    setMsg("");
    try {
      await start(me?.user?.name || "Eco Hero", val);
      setTeamInput("");
      setTeamUpdating(false);
      load();
    } catch (e) {
      setMsg(e.message);
      setTeamUpdating(false);
    }
  };

  const c = d?.community;

  return (
    <div className="stack">
      <div className="row chips">
        {[
          ["global", "Everyone"],
          ["friends", "Friends"],
          ["weekly", "Weekly"],
          ["team", "My team"]
        ].map(([k, l]) => (
          <button
            key={k}
            className={`chip ${tab === k ? "on" : ""}`}
            onClick={() => {
              setMsg("");
              setTab(k);
            }}
          >
            {l}
          </button>
        ))}
      </div>

      {msg && <p className="why err">{msg}</p>}

      {loading ? (
        <p>Loading…</p>
      ) : !d ? (
        <div className="card">
          <p className="muted">Could not load league data.</p>
          <button className="btn small" onClick={load}>Retry</button>
        </div>
      ) : tab === "global" ? (
        <>
          {c && (
            <section className="card">
              <h2>Community goal</h2>
              <p>
                {c.players || 0} players have avoided about{" "}
                <b>{c.co2_saved || 0} kg</b> CO₂ (estimate) of our {c.goal || 500} kg goal.
              </p>
              <div className="bar">
                <div style={{ width: `${Math.min(100, ((c.co2_saved || 0) / (c.goal || 500)) * 100)}%` }} />
              </div>
            </section>
          )}

          <section className="card">
            <h2>Green League</h2>
            <Board rows={d.leaders || []} empty="No players yet." />
          </section>

          {d.colleges && d.colleges.length > 0 && (
            <section className="card">
              <h2>Team standings</h2>
              {d.colleges.map((t, i) => (
                <p key={t.college || i}>
                  {i + 1}. <b>{t.college}</b> · {t.members || 0} players · {t.xp || 0} XP · {t.co2 || 0} kg CO₂
                </p>
              ))}
            </section>
          )}
        </>
      ) : tab === "friends" ? (
        <>
          <section className="card">
            <h2>Friends</h2>
            <p>Your friend code: <span className="code">{me?.user?.friend_code || "------"}</span></p>
            <p className="muted small">Share it so friends can add you. Adding works both ways.</p>
            <div className="row">
              <input
                style={{ maxWidth: 160 }}
                placeholder="Friend's code"
                value={code}
                maxLength={6}
                onChange={(e) => setCode(e.target.value.toUpperCase())}
              />
              <button className="btn" disabled={code.length < 6} onClick={addFriend}>
                Add friend
              </button>
            </div>
          </section>

          <section className="card">
            <h2>Friends leaderboard</h2>
            <Board rows={d.leaders || []} empty="Add a friend to start a private league." />
          </section>
        </>
      ) : tab === "weekly" ? (
        <>
          <section className="card">
            <h2>This week ({d.week || "Current"})</h2>
            <p className="muted small">
              Ranked by XP from missions since Monday. Top 3 each week win a prize you can claim next week:
              {" "}
              {d.prizes &&
                Object.entries(d.prizes)
                  .map(([r, p]) => `#${r}: +${p.xp} XP, +${p.coins} 🪙`)
                  .join(" · ")}
            </p>
            <Board rows={d.this_week || []} empty="No missions completed this week yet." />
          </section>

          <section className="card">
            <h2>Last week's winners</h2>
            <Board rows={d.last_week || []} empty="No results from last week." />
            {d.prize && (
              <p>You placed #{d.my_prev_rank}! Prize: +{d.prize.xp} XP, +{d.prize.coins} 🪙</p>
            )}
            {d.can_claim ? (
              <button className="btn" onClick={() => claim(api.weeklyClaim)}>Claim prize</button>
            ) : null}
          </section>
        </>
      ) : !c ? (
        <section className="card">
          <h2>Join a Team</h2>
          <p>You haven't joined a college or neighbourhood team yet. Enter your college or area name below to join and unlock shared weekly goals:</p>
          <div className="row" style={{ marginTop: 10 }}>
            <input
              style={{ maxWidth: 280 }}
              placeholder="e.g. Green Tech College"
              value={teamInput}
              maxLength={50}
              onChange={(e) => setTeamInput(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && handleJoinTeam()}
            />
            <button
              className="btn"
              disabled={!teamInput.trim() || teamUpdating}
              onClick={() => handleJoinTeam()}
            >
              {teamUpdating ? "Joining…" : "Join Team"}
            </button>
          </div>
        </section>
      ) : (
        <section className="card">
          <h2>Team mission: {c.name}</h2>
          <p>
            {c.members || 1} members have completed <b>{c.count || 0}</b> of <b>{c.goal || 10}</b> missions this week. Together you've avoided about {c.co2 || 0} kg CO₂ (estimate).
          </p>
          <div className="bar">
            <div style={{ width: `${Math.min(100, ((c.count || 0) / (c.goal || 1)) * 100)}%` }} />
          </div>
          <p className="muted small">
            Everyone in the team gets +{c.reward?.xp || 50} XP and +{c.reward?.coins || 25} 🪙 when the goal is reached.
          </p>
          {c.can_claim ? (
            <button className="btn" onClick={() => claim(api.communityClaim)}>Claim team reward</button>
          ) : c.done ? (
            <b className="ok">Reward claimed ✓</b>
          ) : (
            <p className="muted small">Complete your daily missions to help reach this week's team target!</p>
          )}

          <div style={{ marginTop: 18, borderTop: "1px solid var(--line)", paddingTop: 10 }}>
            <details>
              <summary style={{ cursor: "pointer", fontWeight: 700, fontSize: "0.85rem", color: "var(--muted)" }}>
                Switch or rename team
              </summary>
              <div className="row" style={{ marginTop: 8 }}>
                <input
                  style={{ maxWidth: 240 }}
                  placeholder="New college or area"
                  value={teamInput}
                  maxLength={50}
                  onChange={(e) => setTeamInput(e.target.value)}
                  onKeyDown={(e) => e.key === "Enter" && handleJoinTeam()}
                />
                <button
                  className="btn small"
                  disabled={!teamInput.trim() || teamUpdating}
                  onClick={() => handleJoinTeam()}
                >
                  {teamUpdating ? "Updating…" : "Update Team"}
                </button>
              </div>
            </details>
          </div>
        </section>
      )}
    </div>
  );
}
