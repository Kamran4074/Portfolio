import { lazy, Suspense, useEffect, useRef } from "react";
import useContent from "./hooks/useContent";
import Navbar from "./components/Navbar";
import Hero from "./components/Hero";
import About from "./components/About";
import Experience from "./components/Experience";
import Education from "./components/Education";
import Projects from "./components/Projects";
import Skills from "./components/Skills";
import Certifications from "./components/Certifications";
import Contact from "./components/Contact";
import Footer from "./components/Footer";

// The settings page is only downloaded when someone visits /settings (or /admin).
const Admin = lazy(() => import("./admin/Admin"));

export const isSettingsPath = (path) => /^\/(settings|admin)(\/|$)/.test(path);

// Animations are a progressive enhancement: the page is complete without them, and the
// animation code (GSAP, ScrollTrigger, Lenis) is only downloaded after the first paint.
function useMotion(content) {
  const controller = useRef(null);

  useEffect(() => {
    const root = document.documentElement;
    if (!root.classList.contains("motion")) return; // reduced motion, or the inline script gave up
    let cancelled = false;
    const start = () =>
      import("./motion")
        .then((m) => m.startMotion())
        .then((c) => (cancelled ? c.destroy() : (controller.current = c)))
        .catch(() => root.classList.remove("motion")); // never leave content hidden

    const idle = window.requestIdleCallback || ((cb) => setTimeout(cb, 1));
    const id = idle(start);
    return () => {
      cancelled = true;
      (window.cancelIdleCallback || clearTimeout)(id);
      controller.current?.destroy();
      controller.current = null;
    };
  }, []);

  // New or replaced nodes (live API data arriving) need their scroll animations bound.
  useEffect(() => {
    controller.current?.refresh();
  }, [content]);
}

export function Portfolio() {
  const content = useContent();
  const { profile, experience, education, projects, skills, certifications, achievements } = content;
  useMotion(content);

  // Section numbers follow what is actually rendered, so hiding one never leaves a gap.
  const sections = [
    "about",
    experience.length > 0 && "experience",
    education?.length > 0 && "education",
    "projects",
    "skills",
    (certifications.length > 0 || achievements.length > 0) && "credentials",
    "contact",
  ].filter(Boolean);
  const n = (key) => sections.indexOf(key) + 1;

  return (
    <>
      <a href="#main" className="skip-link">Skip to content</a>
      <Navbar name={profile.name} />
      <main id="main" tabIndex={-1}>
        <Hero profile={profile} skills={skills} />
        <About index={n("about")} profile={profile} />
        {experience.length > 0 && <Experience index={n("experience")} items={experience} />}
        {education?.length > 0 && <Education index={n("education")} items={education} />}
        <Projects index={n("projects")} items={projects} profile={profile} />
        <Skills index={n("skills")} items={skills} />
        {(certifications.length > 0 || achievements.length > 0) && (
          <Certifications index={n("credentials")} certifications={certifications} achievements={achievements} />
        )}
        <Contact index={n("contact")} profile={profile} />
      </main>
      <Footer profile={profile} />
    </>
  );
}

export default function App() {
  if (isSettingsPath(window.location.pathname)) {
    return (
      <Suspense fallback={<p style={{ padding: 40 }}>Loading settings…</p>}>
        <Admin />
      </Suspense>
    );
  }
  return <Portfolio />;
}
