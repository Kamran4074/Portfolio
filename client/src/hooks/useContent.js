import { useEffect, useState } from "react";
import api from "../api";
import fallback from "../data/content.json";

// Renders instantly from the bundled content, then swaps in live data from the API.
// If the API is down (e.g. a cold start on a free host) the site still works.
export default function useContent() {
  const [content, setContent] = useState(fallback);

  useEffect(() => {
    let cancelled = false;
    api
      .get("/content")
      .then(({ data }) => {
        if (cancelled || !data?.profile) return;
        setContent({
          profile: data.profile,
          experience: data.experience,
          projects: data.projects,
          skills: data.skills,
          certifications: data.certifications,
          achievements: data.achievements,
        });
      })
      .catch(() => { /* keep fallback */ });
    return () => { cancelled = true; };
  }, []);

  return content;
}
