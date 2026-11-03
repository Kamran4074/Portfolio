import { apiUrl } from "../../api";

// Uploaded screenshot (from /settings). The id is a content hash, so the URL never goes stale.
export const shotSrc = (id) => apiUrl(`/screenshots/${id}`);

// A project's screenshots as { src, caption }: uploaded ones first (a bare id string is
// the first version of the field), else the pasted screenshot URL, else none.
export function shotsOf(p) {
  if (p.images?.length) {
    return p.images.map((x) => (typeof x === "string" ? { src: shotSrc(x), caption: "" } : { src: shotSrc(x.id), caption: x.caption || "" }));
  }
  return p.image ? [{ src: p.image, caption: "" }] : [];
}

export const altOf = (p, shot) => shot?.caption || p.imageAlt || `Screenshot of ${p.title}`;

export const pad = (n) => String(n).padStart(2, "0");

export const slug = (s = "") => s.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");

export const host = (url = "") => {
  try { return new URL(url).host; } catch { return ""; }
};

export const prefersReducedMotion = () =>
  typeof window !== "undefined" && window.matchMedia("(prefers-reduced-motion: reduce)").matches;
