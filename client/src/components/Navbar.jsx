import { useState, useEffect } from "react";
import Icon from "./Icon";

const links = ["About", "Experience", "Projects", "Skills", "Contact"];

const currentTheme = () =>
  document.documentElement.dataset.theme ||
  (window.matchMedia("(prefers-color-scheme: light)").matches ? "light" : "dark");

export default function Navbar({ name = "" }) {
  const [scrolled, setScrolled] = useState(false);
  const [open, setOpen] = useState(false);
  const [theme, setTheme] = useState(currentTheme);

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 20);
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  useEffect(() => {
    document.documentElement.dataset.theme = theme;
    try { localStorage.setItem("theme", theme); } catch { /* storage unavailable */ }
  }, [theme]);

  const handle = name.split(" ")[0]?.toLowerCase() || "home";

  return (
    <>
      <nav className={`navbar ${scrolled ? "scrolled" : ""}`}>
        <a href="#top" className="nav-logo">~/<span>{handle}</span></a>
        <div className="nav-right">
          <ul className="nav-links">
            {links.map((l) => <li key={l}><a href={`#${l.toLowerCase()}`}>{l}</a></li>)}
          </ul>
          <button
            className="icon-btn"
            onClick={() => setTheme(theme === "dark" ? "light" : "dark")}
            aria-label={`Switch to ${theme === "dark" ? "light" : "dark"} theme`}
          >
            <Icon name={theme === "dark" ? "sun" : "moon"} />
          </button>
          <button className="icon-btn hamburger" onClick={() => setOpen(!open)} aria-label="Menu" aria-expanded={open}>
            <Icon name="menu" />
          </button>
        </div>
      </nav>
      <ul className={`mobile-menu ${open ? "open" : ""}`}>
        {links.map((l) => (
          <li key={l}><a href={`#${l.toLowerCase()}`} onClick={() => setOpen(false)}>{l}</a></li>
        ))}
      </ul>
    </>
  );
}
