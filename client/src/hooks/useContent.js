import { useEffect, useState } from "react";
import api from "../api";
import fallback from "../data/content.json";

const KEYS = ["experience", "education", "projects", "skills", "certifications", "achievements"];

// Renders instantly from the bundled content (which is also what gets pre-rendered into
// index.html for search engines), then swaps in live data from the API.
// If the API is down (e.g. a cold start on a free host) the site still works.
export default function useContent() {
  const [content, setContent] = useState(fallback);

  useEffect(() => {
    let cancelled = false;
    api
      .get("/content")
      .then(({ data }) => {
        if (cancelled || !data?.profile) return;
        const next = { profile: data.profile };
        // A collection the API does not know about yet (older backend) keeps its bundled copy.
        for (const key of KEYS) next[key] = Array.isArray(data[key]) ? data[key] : fallback[key] || [];
        setContent(next);
      })
      .catch(() => { /* keep fallback */ });
    return () => { cancelled = true; };
  }, []);

  return content;
}
