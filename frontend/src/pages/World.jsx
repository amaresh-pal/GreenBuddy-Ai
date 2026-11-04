import React from "react";
import { Link } from "react-router-dom";
import { useGame } from "../GameContext";
import EcoWorld from "../components/EcoWorld";
import { XPBar } from "../components/Bits";

export default function World() {
  const { me } = useGame();
  const { user, level, greenness, next_unlock } = me;
  return (
    <div className="stack">
      <section className="card">
        <h2>My EcoWorld</h2>
        <EcoWorld greenness={greenness} inventory={user.inventory} level={level.level} />
        <p>Island health: <b>{Math.round(greenness * 100)}%</b>. Earn XP to clear the smog and bring the factory smoke down.</p>
        <XPBar level={level} />
        {next_unlock && <p className="muted">Next free unlock at level {next_unlock.level}: {next_unlock.item.emoji} {next_unlock.item.name}</p>}
        <Link className="btn" to="/rewards">Spend EcoCoins in the shop</Link>
      </section>
    </div>
  );
}
