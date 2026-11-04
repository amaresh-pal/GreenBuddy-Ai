import React from "react";
import { createRoot } from "react-dom/client";
import { BrowserRouter } from "react-router-dom";
import App from "./App";
import { GameProvider } from "./GameContext";
import "./styles.css";

createRoot(document.getElementById("root")).render(
  <BrowserRouter><GameProvider><App /></GameProvider></BrowserRouter>
);
