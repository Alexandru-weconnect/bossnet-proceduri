import "@fontsource/barlow-condensed/latin-ext-400.css";
import "@fontsource/barlow-condensed/latin-ext-500.css";
import "@fontsource/barlow-condensed/latin-ext-600.css";
import "@fontsource/manrope/latin-ext-400.css";
import "@fontsource/manrope/latin-ext-500.css";
import "@fontsource/manrope/latin-ext-600.css";
import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import App from "./App";
import "./styles.css";

const root = document.getElementById("root");

if (!root) throw new Error("Elementul #root lipsește.");

createRoot(root).render(
  <StrictMode>
    <App />
  </StrictMode>,
);
