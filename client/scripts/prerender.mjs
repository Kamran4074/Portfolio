// Runs after `vite build`. Writes the fully rendered portfolio into dist/index.html, adds
// JSON-LD structured data, and generates robots.txt and sitemap.xml for SITE_URL.
//
// Why: the site is a React SPA, so without this the HTML a crawler or link preview first
// receives is an empty <div id="root">. With it, every heading, project and link is in
// the initial HTML, and React hydrates it in the browser.
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";
import { SITE_URL } from "../site.config.mjs";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const dist = path.join(root, "dist");
const ssrDir = path.join(root, "dist-ssr");
const content = JSON.parse(fs.readFileSync(path.join(root, "src/data/content.json"), "utf8"));

const { render } = await import(pathToFileURL(path.join(ssrDir, "entry-server.mjs")).href);
const appHtml = render();

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
      sameAs: (profile.socials || []).map((s) => s.url),
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
const jsonLdTag = `<script type="application/ld+json">${JSON.stringify(jsonLd).replace(/</g, "\\u003c")}</script>`;

const indexPath = path.join(dist, "index.html");
const template = fs.readFileSync(indexPath, "utf8");
if (!template.includes("<!--app-html-->")) throw new Error("index.html is missing the <!--app-html--> marker");
fs.writeFileSync(indexPath, template.replace("<!--app-html-->", appHtml).replace("<!--app-jsonld-->", jsonLdTag));

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
console.log(`prerender: ${(appHtml.length / 1024).toFixed(1)} KB of HTML, robots.txt and sitemap.xml for ${SITE_URL}`);
