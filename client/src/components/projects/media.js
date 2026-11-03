import { apiUrl } from "../../api";

// Uploaded screenshot (from /settings). The id is a content hash, so the URL never goes stale.
export const shotSrc = (id) => apiUrl(`/screenshots/${id}`);

// A project's screenshots as { src, srcSet?, caption }: uploaded ones first (a bare id
// string is the first version of the field), else the pasted screenshot URL, else none.
// srcSet lets phones pick the 800px copy instead of the 1600px one.
export function shotsOf(p) {
  if (p.images?.length) {
    return p.images.map((x) => {
      if (typeof x === "string") return { src: shotSrc(x), caption: "" };
      const src = shotSrc(x.id);
      return { src, srcSet: x.thumb ? `${shotSrc(x.thumb)} 800w, ${src} 1600w` : undefined, caption: x.caption || "" };
    });
  }
  return p.image ? [{ src: p.image, caption: "" }] : [];
}

// Rendered width of a card's picture: the featured card's media column is about half the
// 1200px container on desktop; elsewhere a card is at most ~400px, or the screen width on phones.
export const SHOT_SIZES = "(min-width: 900px) 600px, (min-width: 700px) 50vw, 100vw";

export const altOf = (p, shot) => shot?.caption || p.imageAlt || `Screenshot of ${p.title}`;

export const pad = (n) => String(n).padStart(2, "0");

export const slug = (s = "") => s.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");

export const host = (url = "") => {
  try { return new URL(url).host; } catch { return ""; }
};

export const prefersReducedMotion = () =>
  typeof window !== "undefined" && window.matchMedia("(prefers-reduced-motion: reduce)").matches;
