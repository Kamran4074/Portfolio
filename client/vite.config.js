import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import { SITE_URL } from "./site.config.mjs";

// Fills __SITE_URL__ placeholders in index.html (canonical, og:url, og:image...).
const siteUrl = () => ({
  name: "site-url",
  transformIndexHtml: (html) => html.replaceAll("__SITE_URL__", SITE_URL),
});

export default defineConfig(({ isSsrBuild }) => ({
  plugins: [react(), siteUrl()],
  server: {
    proxy: { "/api": "http://localhost:5000" },
  },
  build: isSsrBuild
    ? // Build-time renderer for scripts/prerender.mjs. .mjs so Node loads it as ESM.
      { rollupOptions: { output: { entryFileNames: "[name].mjs" } } }
    : {},
}));
