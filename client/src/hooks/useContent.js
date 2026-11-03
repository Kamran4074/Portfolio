import { useEffect, useState } from "react";
import api from "../api";
import fallback from "../data/content.json";
import { safeUrl } from "../safeUrl";

const KEYS = ["experience", "education", "projects", "skills", "certifications", "achievements"];

// Every link shown on the site goes through safeUrl; an unsafe one is dropped (rendered as
// if empty), so a javascript: link can never become a clickable href.
const clean = (u) => safeUrl(u) || "";
export function sanitizeContent(content) {
  const p = content.profile || {};
  return {
    ...content,
    profile: {
      ...p,
      resumeUrl: clean(p.resumeUrl),
      photoUrl: clean(p.photoUrl),
      socials: (p.socials || []).filter((s) => safeUrl(s.url)),
      stats: (p.stats || []).map((s) => ({ ...s, url: clean(s.url) })),
    },
    projects: (content.projects || []).map((x) => ({ ...x, demoUrl: clean(x.demoUrl), githubUrl: clean(x.githubUrl), image: clean(x.image) })),
    certifications: (content.certifications || []).map((c) => ({ ...c, url: clean(c.url) })),
  };
}

// Normalizes an API /content response: a collection the API does not know about yet
// (older backend) keeps its bundled copy.
export function fromApi(data) {
  const next = { profile: data.profile };
  for (const key of KEYS) next[key] = Array.isArray(data[key]) ? data[key] : fallback[key] || [];
  return next;
}

// The content index.html was pre-rendered with (scripts/prerender.mjs writes it into the
// page), so hydration matches the HTML exactly. Falls back to the bundled content.json.
function snapshot() {
  if (typeof document === "undefined") return null;
  try {
    return JSON.parse(document.getElementById("initial-content")?.textContent || "null");
  } catch {
    return null;
  }
}

// Renders instantly from the pre-rendered snapshot (or bundled content), then swaps in
// live data from the API. If the API is down (e.g. a cold start) the site still works.
export default function useContent(initial) {
  const [content, setContent] = useState(() => sanitizeContent(initial || snapshot() || fallback));

  useEffect(() => {
    let cancelled = false;
    api
      .get("/content")
      .then(({ data }) => {
        if (cancelled || !data?.profile) return;
        setContent(sanitizeContent(fromApi(data)));
      })
      .catch(() => { /* keep what is shown */ });
    return () => { cancelled = true; };
  }, []);

  return content;
}
