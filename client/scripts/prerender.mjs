// Runs after `vite build`. Writes the fully rendered portfolio into dist/index.html, adds
// JSON-LD structured data and a Content-Security-Policy, and generates robots.txt and
// sitemap.xml for SITE_URL.
//
// Why: the site is a React SPA, so without this the HTML a crawler or link preview first
// receives is an empty <div id="root">. With it, every heading, project and link is in
// the initial HTML, and React hydrates it in the browser.
//
// Content: the live API (PRERENDER_API_URL, else VITE_API_URL) so search engines see what
// was edited in /settings; content.json when the API cannot be reached during the build.
// A redeploy (e.g. the server's DEPLOY_HOOK_URL after each save) refreshes it.
import crypto from "node:crypto";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";
import { SITE_URL } from "../site.config.mjs";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const dist = path.join(root, "dist");
const ssrDir = path.join(root, "dist-ssr");
const bundled = JSON.parse(fs.readFileSync(path.join(root, "src/data/content.json"), "utf8"));
const apiBase = (process.env.PRERENDER_API_URL || process.env.VITE_API_URL || "").replace(/\/+$/, "");

const { render, fromApi, sanitizeContent } = await import(pathToFileURL(path.join(ssrDir, "entry-server.mjs")).href);

async function loadContent() {
  if (!apiBase) return { content: bundled, source: "content.json (no PRERENDER_API_URL/VITE_API_URL)" };
  try {
    const res = await fetch(`${apiBase}/api/content`, { signal: AbortSignal.timeout(15000) });
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    const data = await res.json();
    if (!data?.profile) throw new Error("no profile in response");
    return { content: fromApi(data), source: `${apiBase}/api/content` };
  } catch (err) {
    console.warn(`prerender: API not reachable (${err.message}), using content.json`);
    return { content: bundled, source: "content.json (API fallback)" };
  }
}

const { content: raw, source } = await loadContent();
const content = sanitizeContent(raw);
const appHtml = render(content);

// ── Structured data: only facts that are on the page ───────────────────────
const { profile, experience = [], education = [], skills = [] } = content;
const current = experience.find((e) => /present/i.test(e.end || ""));
const [city, region] = (profile.location || "").split(",").map((s) => s.trim());
const jsonLd = {
  "@context": "https://schema.org",
  "@graph": [
    {
      "@type": "Person",
      "@id": `${SITE_URL}/#person`,
      name: profile.name,
      url: `${SITE_URL}/`,
      image: `${SITE_URL}/images/kamran-alam-480.jpg`,
      jobTitle: profile.title.split("·")[0].trim(),
      description: profile.tagline,
      email: profile.email ? `mailto:${profile.email}` : undefined,
      address: city ? { "@type": "PostalAddress", addressLocality: city, addressRegion: region, addressCountry: "IN" } : undefined,
      worksFor: current ? { "@type": "Organization", name: current.company } : undefined,
      alumniOf: education.map((e) => ({ "@type": "CollegeOrUniversity", name: e.institution })),
      knowsAbout: [...new Set(skills.filter((g) => /backend|database|frontend|language/i.test(g.title)).flatMap((g) => g.items))],
      sameAs: (profile.socials || []).map((s) => s.url).filter((u) => /^https?:/.test(u)),
    },
    {
      "@type": "WebSite",
      "@id": `${SITE_URL}/#website`,
      url: `${SITE_URL}/`,
      name: profile.name,
      inLanguage: "en",
      publisher: { "@id": `${SITE_URL}/#person` },
    },
  ],
};
// "<" escaped so content can never close the script tag.
const jsonTag = (attrs, data) => `<script ${attrs}>${JSON.stringify(data).replace(/</g, "\\u003c")}</script>`;
const jsonLdTag = jsonTag('type="application/ld+json"', jsonLd);
// The exact content the HTML was rendered with, so React hydrates without a mismatch.
const snapshotTag = jsonTag('id="initial-content" type="application/json"', content);

const indexPath = path.join(dist, "index.html");
const template = fs.readFileSync(indexPath, "utf8");
if (!template.includes("<!--app-html-->")) throw new Error("index.html is missing the <!--app-html--> marker");
let html = template
  .replace("<!--app-html-->", appHtml)
  .replace("<!--app-jsonld-->", jsonLdTag)
  .replace("</body>", `${snapshotTag}\n  </body>`);

// ── Content-Security-Policy (meta tag; frame-ancestors is sent as a header, see vercel.json)
// Inline scripts and inline event handlers are allowed by hash only, computed from the
// final HTML, so editing index.html can never silently break or weaken the policy.
const sha256 = (text) => `'sha256-${crypto.createHash("sha256").update(text).digest("base64")}'`;
const inlineScripts = [...html.matchAll(/<script(?![^>]*\bsrc=)(?![^>]*type="application\/(?:ld\+)?json")[^>]*>([\s\S]*?)<\/script>/g)].map((m) => m[1]);
const handlers = [...html.matchAll(/\son[a-z]+="([^"]*)"/g)].map((m) => m[1].replace(/&#39;/g, "'").replace(/&quot;/g, '"'));
const apiOrigin = (() => {
  try { return process.env.VITE_API_URL ? new URL(process.env.VITE_API_URL).origin : ""; } catch { return ""; }
})();
const csp = [
  "default-src 'self'",
  `script-src 'self' ${inlineScripts.map(sha256).join(" ")}${handlers.length ? ` 'unsafe-hashes' ${[...new Set(handlers)].map(sha256).join(" ")}` : ""}`,
  // React renders style="" attributes and GSAP/Motion animate styles: inline styles stay allowed.
  "style-src 'self' 'unsafe-inline' https://fonts.googleapis.com",
  "font-src 'self' https://fonts.gstatic.com",
  // Screenshots come from the API; a pasted screenshot URL can be any https host.
  "img-src 'self' data: blob: https:",
  `connect-src 'self'${apiOrigin ? ` ${apiOrigin}` : ""}`,
  "object-src 'none'",
  "base-uri 'self'",
  "form-action 'self'",
  "upgrade-insecure-requests",
].join("; ");
html = html.replace("<head>", `<head>\n    <meta http-equiv="Content-Security-Policy" content="${csp}" />`);
fs.writeFileSync(indexPath, html);

// ── robots.txt and sitemap.xml ──────────────────────────────────────────────
fs.writeFileSync(
  path.join(dist, "robots.txt"),
  `User-agent: *\nAllow: /\nDisallow: /settings\nDisallow: /admin\n\nSitemap: ${SITE_URL}/sitemap.xml\n`
);
const today = new Date().toISOString().slice(0, 10);
fs.writeFileSync(
  path.join(dist, "sitemap.xml"),
  `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
  <url>
    <loc>${SITE_URL}/</loc>
    <lastmod>${today}</lastmod>
    <changefreq>monthly</changefreq>
    <priority>1.0</priority>
  </url>
</urlset>
`
);

fs.rmSync(ssrDir, { recursive: true, force: true });
console.log(`prerender: ${(appHtml.length / 1024).toFixed(1)} KB of HTML from ${source}; CSP with ${inlineScripts.length} script + ${handlers.length} handler hashes; robots.txt and sitemap.xml for ${SITE_URL}`);
