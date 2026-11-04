import React, { useEffect, useState } from "react";
import { NavLink, Route, Routes } from "react-router-dom";
import { useGame } from "./GameContext";
import { Celebration } from "./components/Bits";
import Dashboard from "./pages/Dashboard";
import Missions from "./pages/Missions";
import World from "./pages/World";
import Rewards from "./pages/Rewards";
import Impact from "./pages/Impact";
import League from "./pages/League";

function Onboarding() {
  const { start, error } = useGame();
  const [name, setName] = useState("");
  const [college, setCollege] = useState("");
  return (
    <div className="onboard">
      <div className="card">
        <h1>GreenBuddy 🌱</h1>
        <p>Your island starts polluted. Every green action you do in real life cleans it up.</p>
        <label>Your name<input value={name} onChange={(e) => setName(e.target.value)} maxLength={30} /></label>
        <label>College or neighbourhood (for team leaderboards)<input value={college} onChange={(e) => setCollege(e.target.value)} maxLength={50} /></label>
        {error && <p className="err">{error}</p>}
        <button className="btn" disabled={!name.trim()} onClick={() => start(name.trim(), college.trim())}>Start playing</button>
      </div>
    </div>
  );
}

const TABS = [["/", "🏠", "Home"], ["/missions", "🎯", "Missions"], ["/world", "🏝️", "EcoWorld"],
  ["/rewards", "🏅", "Rewards"], ["/impact", "📊", "Impact"], ["/league", "👥", "League"]];

export default function App() {
  const { me, needsName, celebration, setCelebration, error } = useGame();
  useEffect(() => { document.documentElement.dataset.theme = me?.user?.theme || "meadow"; }, [me?.user?.theme]);
  if (needsName) return <Onboarding />;
  if (!me) return <div className="onboard"><p>{error || "Loading your island…"}</p></div>;
  const { user, level } = me;
  return (
    <>
      <header className="top">
        <b className="brand">GreenBuddy</b>
        <div className="stats">
          <span>Lv {level.level}</span><span>🪙 {user.coins}</span><span>🔥 {user.streak}</span>
        </div>
      </header>
      <nav className="nav">
        {TABS.map(([to, icon, label]) => (
          <NavLink key={to} to={to} end={to === "/"}><span>{icon}</span>{label}</NavLink>
        ))}
      </nav>
      <main>
        <Routes>
          <Route path="/" element={<Dashboard />} />
          <Route path="/missions" element={<Missions />} />
          <Route path="/world" element={<World />} />
          <Route path="/rewards" element={<Rewards />} />
          <Route path="/impact" element={<Impact />} />
          <Route path="/league" element={<League />} />
        </Routes>
      </main>
      <Celebration r={celebration} onClose={() => setCelebration(null)} />
    </>
  );
}
