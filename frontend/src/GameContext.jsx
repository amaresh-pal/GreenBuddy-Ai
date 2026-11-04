import React, { createContext, useContext, useEffect, useState, useCallback } from "react";
import { api } from "./api";

const Ctx = createContext(null);
export const useGame = () => useContext(Ctx);

export function GameProvider({ children }) {
  const [me, setMe] = useState(null);
  const [needsName, setNeedsName] = useState(false);
  const [celebration, setCelebration] = useState(null);
  const [error, setError] = useState("");

  const start = useCallback(async (name, college) => {
    try {
      setMe(await api.init(name, college));
      localStorage.setItem("gb_name", name);
      localStorage.setItem("gb_college", college || "");
      setNeedsName(false);
    } catch (e) { setError(e.message); }
  }, []);

  useEffect(() => {
    const name = localStorage.getItem("gb_name");
    name ? start(name, localStorage.getItem("gb_college") || "") : setNeedsName(true);
  }, [start]);

  // Any action that returns a fresh `me` payload updates the game state and may trigger a celebration.
  const apply = (result) => {
    if (result.me) setMe(result.me);
    if (result.xp_gain || result.leveled_up || result.achievements?.length || result.boss_defeated || result.new_items?.length)
      setCelebration(result);
  };
  const complete = async (id) => { const r = await api.complete(id); apply(r); setCelebration((c) => c || r); return r; };

  return (
    <Ctx.Provider value={{ me, setMe, needsName, start, error, celebration, setCelebration, complete, apply }}>
      {children}
    </Ctx.Provider>
  );
}
