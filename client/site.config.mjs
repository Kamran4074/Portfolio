// The one place the public URL lives. Used for the canonical link, Open Graph/Twitter tags,
// JSON-LD, robots.txt and sitemap.xml. When a custom domain is set up, change it here
// (or set VITE_SITE_URL in the Vercel project) and redeploy. No trailing slash.
export const SITE_URL = (process.env.VITE_SITE_URL || "https://kamranalam.vercel.app").replace(/\/+$/, "");
