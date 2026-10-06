import React from "react";
import ReactDOM from "react-dom/client";
import App, { isSettingsPath } from "./App";
import "./index.css";

const container = document.getElementById("root");
const app = (
  <React.StrictMode>
    <App />
  </React.StrictMode>
);

// index.html ships with the portfolio pre-rendered (see scripts/prerender.mjs), so the
// portfolio hydrates that markup. The settings page is a different tree and renders fresh.
// (firstElementChild, not hasChildNodes: in dev the root only holds the <!--app-html--> marker.)
if (container.firstElementChild && !isSettingsPath(window.location.pathname)) {
  ReactDOM.hydrateRoot(container, app);
} else {
  container.textContent = "";
  ReactDOM.createRoot(container).render(app);
}
