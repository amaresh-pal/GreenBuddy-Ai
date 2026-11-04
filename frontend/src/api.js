const BASE = import.meta.env.VITE_API_URL || "";

export function getUid() {
  let id = localStorage.getItem("gb_uid");
  if (!id) { id = crypto.randomUUID(); localStorage.setItem("gb_uid", id); }
  return id;
}

async function req(path, opts = {}) {
  const res = await fetch(BASE + path, {
    ...opts,
    headers: { "Content-Type": "application/json", "X-User-Id": getUid() },
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(data.error || "Something went wrong. Try again.");
  return data;
}
const post = (body) => ({ method: "POST", body: JSON.stringify(body) });

export const api = {
  init: (name, college) => req("/api/users/init", post({ uid: getUid(), name, college })),
  me: () => req("/api/me"),
  missions: (demo, loc) => {
    const p = new URLSearchParams();
    if (demo && demo !== "auto") p.set("demo", demo);
    if (loc) { p.set("lat", loc.lat); p.set("lon", loc.lon); }
    const q = p.toString();
    return req("/api/missions" + (q ? "?" + q : ""));
  },
  guides: () => req("/api/guides"),
  addFriend: (code) => req("/api/friends/add", post({ code })),
  weekly: () => req("/api/weekly"),
  weeklyClaim: () => req("/api/weekly/claim", post({})),
  community: () => req("/api/community"),
  communityClaim: () => req("/api/community/claim", post({})),
  setTheme: (theme) => req("/api/theme", post({ theme })),
  complete: (mission_id) => req("/api/missions/complete", post({ mission_id })),
  footprint: (inputs) => (inputs ? req("/api/footprint", post(inputs)) : req("/api/footprint")),
  electricity: (appliances, tariff) => req("/api/tools/electricity", post({ appliances, tariff })),
  solar: (body) => req("/api/tools/solar", post(body)),
  achievements: () => req("/api/achievements"),
  shop: () => req("/api/shop"),
  buy: (item_id) => req("/api/shop/buy", post({ item_id })),
  leaderboard: (scope = "global") => req("/api/leaderboard?scope=" + scope),
};
