import { lazy, Suspense } from "react";
import useContent from "./hooks/useContent";
import Navbar from "./components/Navbar";
import Hero from "./components/Hero";
import About from "./components/About";
import Experience from "./components/Experience";
import Projects from "./components/Projects";
import Skills from "./components/Skills";
import Certifications from "./components/Certifications";
import Contact from "./components/Contact";

// The settings page is only downloaded when someone visits /settings (or /admin).
const Admin = lazy(() => import("./admin/Admin"));

function Portfolio() {
  const { profile, experience, projects, skills, certifications, achievements } = useContent();
  const github = profile.socials?.find((s) => /github/i.test(s.label))?.url;

  return (
    <>
      <Navbar name={profile.name} />
      <main>
        <Hero profile={profile} skills={skills} />
        <About profile={profile} />
        {experience.length > 0 && <Experience items={experience} />}
        <Projects items={projects} github={github} />
        <Skills items={skills} />
        {(certifications.length > 0 || achievements.length > 0) && (
          <Certifications certifications={certifications} achievements={achievements} />
        )}
        <Contact profile={profile} />
      </main>
      <footer className="footer">
        <span>© {new Date().getFullYear()} {profile.name}</span>
        <span className="mono">React · Node.js · Express · MongoDB</span>
      </footer>
    </>
  );
}

export default function App() {
  if (/^\/(settings|admin)(\/|$)/.test(window.location.pathname)) {
    return (
      <Suspense fallback={<p style={{ padding: 40 }}>Loading settings…</p>}>
        <Admin />
      </Suspense>
    );
  }
  return <Portfolio />;
}
