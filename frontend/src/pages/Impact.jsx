import React, { useEffect, useState } from "react";
import { useGame } from "../GameContext";
import { api } from "../api";
import { CAT } from "../theme";

const Field = ({ label, value, set, step = "any" }) => (
  <label>{label}<input type="number" min="0" step={step} value={value} onChange={(e) => set(e.target.value)} /></label>
);

function Footprint() {
  const [f, setF] = useState({ electricity_kwh: 150, car_km: 0, two_wheeler_km: 40, auto_km: 0, bus_km: 20, metro_km: 0, lpg_cylinders: 1, diet: "mixed" });
  const [hist, setHist] = useState([]);
  const [nudge, setNudge] = useState("");
  const set = (k) => (v) => setF({ ...f, [k]: v });
  useEffect(() => { api.footprint().then((r) => setHist(r.history)); }, []);
  const save = async () => { const r = await api.footprint(f); setHist(r.history); setNudge(r.nudge || ""); };
  const last = hist[hist.length - 1];
  const max = Math.max(160, ...hist.map((h) => h.total));
  return (
    <div className="stack">
      <div className="card">
        <h3>Monthly footprint (estimate)</h3>
        <div className="form">
          <Field label="Electricity (kWh / month)" value={f.electricity_kwh} set={set("electricity_kwh")} />
          <Field label="LPG cylinders / month" value={f.lpg_cylinders} set={set("lpg_cylinders")} />
          <Field label="Car (km / week)" value={f.car_km} set={set("car_km")} />
          <Field label="Two-wheeler (km / week)" value={f.two_wheeler_km} set={set("two_wheeler_km")} />
          <Field label="Auto (km / week)" value={f.auto_km} set={set("auto_km")} />
          <Field label="Bus (km / week)" value={f.bus_km} set={set("bus_km")} />
          <Field label="Metro / train (km / week)" value={f.metro_km} set={set("metro_km")} />
          <label>Diet<select value={f.diet} onChange={(e) => set("diet")(e.target.value)}>
            <option value="veg">Vegetarian</option><option value="mixed">Mixed</option><option value="nonveg">Non-vegetarian</option></select></label>
        </div>
        <button className="btn" onClick={save}>Save today's footprint</button>
        {nudge && <p className="why">🎯 {nudge}</p>}
      </div>
      {last && (
        <div className="card">
          <h3>{last.total} kg CO₂e / month</h3>
          <p className="muted">That is {Math.abs(last.vs_avg_pct)}% {last.vs_avg_pct > 0 ? "above" : "below"} the rough national average of {last.india_avg} kg.</p>
          {["electricity", "transport", "diet", "cooking"].map((k) => (
            <div key={k} className="hrow"><span>{k}</span><div className="bar"><div style={{ width: `${(last[k] / max) * 100}%` }} /></div><b>{last[k]}</b></div>
          ))}
          <h4>Progress over time</h4>
          <div className="spark">{hist.map((h) => <div key={h.date} title={`${h.date}: ${h.total} kg`} style={{ height: `${(h.total / max) * 100}%` }} />)}</div>
        </div>
      )}
    </div>
  );
}

function Electricity() {
  const [rows, setRows] = useState([
    { name: "Air conditioner", watts: 1500, hours: 6, qty: 1 }, { name: "Ceiling fan", watts: 75, hours: 10, qty: 2 },
    { name: "LED bulb", watts: 9, hours: 6, qty: 5 }, { name: "Fridge", watts: 150, hours: 8, qty: 1 }, { name: "TV", watts: 100, hours: 4, qty: 1 }]);
  const [tariff, setTariff] = useState(7);
  const [res, setRes] = useState(null);
  const upd = (i, k, v) => setRows(rows.map((r, j) => (j === i ? { ...r, [k]: v } : r)));
  return (
    <div className="card stack">
      <h3>Electricity calculator</h3>
      <p className="muted small">Hours are daily use. Fridge hours are the equivalent running time.</p>
      {rows.map((r, i) => (
        <div className="arow" key={i}>
          <input value={r.name} onChange={(e) => upd(i, "name", e.target.value)} />
          <input type="number" value={r.watts} onChange={(e) => upd(i, "watts", e.target.value)} title="Watts" />
          <input type="number" value={r.hours} onChange={(e) => upd(i, "hours", e.target.value)} title="Hours per day" />
          <input type="number" value={r.qty} onChange={(e) => upd(i, "qty", e.target.value)} title="Quantity" />
        </div>
      ))}
      <div className="row"><button className="btn ghost" onClick={() => setRows([...rows, { name: "Appliance", watts: 100, hours: 2, qty: 1 }])}>Add appliance</button>
        <Field label="Tariff (₹ / kWh)" value={tariff} set={setTariff} /></div>
      <button className="btn" onClick={async () => setRes(await api.electricity(rows, tariff))}>Calculate</button>
      {res && (<div>
        <p><b>{res.total_kwh} kWh</b> / month · ₹{res.monthly_cost} · {res.co2_kg} kg CO₂ (estimate)</p>
        {res.nudge && <p className="why">🎯 {res.nudge}</p>}
        {res.top && <p>Biggest user: <b>{res.top.name}</b> ({res.top.kwh} kWh). {res.top.tip}</p>}
      </div>)}
    </div>
  );
}

function Solar() {
  const { apply } = useGame();
  const [s, setS] = useState({ roof_m2: 40, sun_hours: 5.5, tariff: 7, cost_per_kw: 55000 });
  const [res, setRes] = useState(null);
  const set = (k) => (v) => setS({ ...s, [k]: v });
  const run = async () => { const r = await api.solar(s); setRes(r.result); apply(r); };
  return (
    <div className="card stack">
      <h3>Rooftop solar estimator</h3>
      <div className="form">
        <Field label="Roof area (m²)" value={s.roof_m2} set={set("roof_m2")} />
        <Field label="Sun hours / day" value={s.sun_hours} set={set("sun_hours")} />
        <Field label="Tariff (₹ / kWh)" value={s.tariff} set={set("tariff")} />
        <Field label="Install cost (₹ / kW)" value={s.cost_per_kw} set={set("cost_per_kw")} />
      </div>
      <button className="btn" onClick={run}>Estimate</button>
      {res && (<div>
        <p><b>{res.capacity_kw} kW</b> system · about {res.monthly_kwh} kWh / month · saves about ₹{res.monthly_saving} / month</p>
        <p>Cost about ₹{res.install_cost} · payback about {res.payback_years} years · avoids about {res.co2_year_kg} kg CO₂ / year (≈ {res.trees_equivalent} trees)</p>
        <p className="muted small">Rough estimate. Get a site survey and check current subsidies before buying.</p>
      </div>)}
    </div>
  );
}

function Guides() {
  const [g, setG] = useState([]);
  useEffect(() => { api.guides().then(setG); }, []);
  return (
    <div className="stack">
      {g.map((x) => (
        <details key={x.id} className="card">
          <summary><b>{CAT[x.category]?.emoji || "🏠"} {x.title}</b></summary>
          <p>{x.summary}</p>
          <ul>{x.steps.map((s) => <li key={s}>{s}</li>)}</ul>
        </details>
      ))}
    </div>
  );
}

export default function Impact() {
  const [tab, setTab] = useState("footprint");
  return (
    <div className="stack">
      <div className="row chips">{[["footprint", "Footprint"], ["electricity", "Electricity"], ["solar", "Solar"], ["guides", "Guides"]].map(([k, l]) => (
        <button key={k} className={`chip ${tab === k ? "on" : ""}`} onClick={() => setTab(k)}>{l}</button>))}</div>
      {tab === "footprint" ? <Footprint /> : tab === "electricity" ? <Electricity /> : tab === "solar" ? <Solar /> : <Guides />}
    </div>
  );
}
