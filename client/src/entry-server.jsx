// Build-time only: renders the portfolio (from the bundled content.json) to static HTML.
// Used by scripts/prerender.mjs so crawlers and no-JS visitors get the full page.
import { renderToString } from "react-dom/server";
import { Portfolio } from "./App";

export const render = () => renderToString(<Portfolio />);
