// Build-time only: renders the portfolio to static HTML. scripts/prerender.mjs passes the
// live content from the API (or content.json when the API is not reachable during the build),
// so crawlers and no-JS visitors get the full, current page.
import { renderToString } from "react-dom/server";
import { Portfolio } from "./App";
import { fromApi, sanitizeContent } from "./hooks/useContent";

export { fromApi, sanitizeContent };
export const render = (content) => renderToString(<Portfolio initialContent={content} />);
