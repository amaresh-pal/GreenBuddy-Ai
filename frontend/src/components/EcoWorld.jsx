import React from "react";

const lerp = (a, b, t) => Math.round(a + (b - a) * t);

// The island visibly heals as `greenness` (0-1, driven by XP) rises, and gains items from `inventory`.
export default function EcoWorld({ greenness = 0.2, inventory = [], level = 1 }) {
  const has = (id) => inventory.includes(id);
  const smog = 1 - greenness;
  const sky = `rgb(${lerp(150, 125, greenness)},${lerp(150, 205, greenness)},${lerp(145, 245, greenness)})`;
  const grass = `rgb(${lerp(150, 70, greenness)},${lerp(130, 175, greenness)},${lerp(90, 85, greenness)})`;
  const T = (x, y, size, ch, extra = {}) => (
    <text x={x} y={y} fontSize={size} textAnchor="middle" {...extra}>{ch}</text>
  );
  return (
    <svg viewBox="0 0 400 290" className="world" role="img" aria-label="Your EcoWorld island">
      <rect width="400" height="290" fill={sky} rx="22" />
      <circle cx="338" cy="52" r="24" fill="#ffd54a" opacity={0.3 + greenness * 0.7} />
      <g fill="#6b6b6b" opacity={smog * 0.85}>
        <ellipse cx="90" cy="55" rx="58" ry="18" /><ellipse cx="230" cy="85" rx="48" ry="14" />
      </g>
      <g fill="#fff" opacity={greenness * 0.9}>
        <ellipse cx="110" cy="50" rx="40" ry="12" /><ellipse cx="250" cy="80" rx="32" ry="10" />
      </g>
      {T(52, 178, 34, "🏭", { opacity: smog })}
      <ellipse cx="200" cy="225" rx="150" ry="46" fill="#6e4f33" />
      <ellipse cx="200" cy="205" rx="150" ry="44" fill={grass} />
      {has("pond") && <ellipse cx="165" cy="216" rx="32" ry="10" fill="#4aa8e0" />}
      {has("sapling") && T(200, 198, 38, level >= 6 ? "🌳" : level >= 3 ? "🌿" : "🌱")}
      {has("oak") && T(128, 194, 46, "🌳")}
      {has("mango") && T(300, 192, 32, "🥭")}
      {has("eco_house") && T(250, 186, 42, "🏡")}
      {has("flowers") && [[215, 224], [242, 220], [265, 226]].map(([x, y], i) => T(x, y, 20, i % 2 ? "🌼" : "🌸", { key: i }))}
      {has("solar_panel") && (
        <g fill="#274c77" stroke="#9ec9f2" strokeWidth="1.5">
          <path d="M62 208 l16 -12 h22 l-16 12z" /><path d="M84 214 l16 -12 h22 l-16 12z" />
        </g>
      )}
      {has("wind_turbine") && (
        <g stroke="#f4f4f4" strokeWidth="3" strokeLinecap="round">
          <line x1="338" y1="205" x2="338" y2="140" />
          <g className="blades"><line x1="338" y1="118" x2="338" y2="162" /><line x1="316" y1="140" x2="360" y2="140" /></g>
        </g>
      )}
      {has("butterflies") && (<g className="float">{T(150, 150, 20, "🦋")}{T(262, 128, 18, "🦋")}</g>)}
      {greenness > 0.7 && T(320, 100, 20, "🐦", { className: "float" })}
    </svg>
  );
}
