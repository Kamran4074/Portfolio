import { useEffect, useLayoutEffect, useRef, useState } from "react";
import Icon from "./Icon";

const links = [
  { id: "about", label: "About" },
  { id: "experience", label: "Experience" },
  { id: "projects", label: "Projects" },
  { id: "skills", label: "Skills" },
  { id: "contact", label: "Contact" },
];

// useLayoutEffect warns during the build-time pre-render; it only matters in the browser.
const useIsoLayoutEffect = typeof window === "undefined" ? useEffect : useLayoutEffect;

export default function Navbar({ name = "" }) {
  const [scrolled, setScrolled] = useState(false);
  const [open, setOpen] = useState(false);
  const [active, setActive] = useState(null);
  const listRef = useRef(null);
  const indicatorRef = useRef(null);
  const toggleRef = useRef(null);

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 24);
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  // Active section: whichever section crosses the middle band of the viewport.
  useEffect(() => {
    const sections = links.map((l) => document.getElementById(l.id)).filter(Boolean);
    const observer = new IntersectionObserver(
      (entries) => entries.forEach((e) => e.isIntersecting && setActive(e.target.id)),
      { rootMargin: "-45% 0px -50% 0px" }
    );
    sections.forEach((s) => observer.observe(s));
    const onTop = () => window.scrollY < 200 && setActive(null);
    window.addEventListener("scroll", onTop, { passive: true });
    return () => {
      observer.disconnect();
      window.removeEventListener("scroll", onTop);
    };
  }, []);

  // One shared underline that slides between links (transform only, no layout animation).
  useIsoLayoutEffect(() => {
    const indicator = indicatorRef.current;
    const link = active && listRef.current?.querySelector(`a[href="#${active}"]`);
    if (!indicator) return;
    if (!link) {
      indicator.style.opacity = "0";
      return;
    }
    indicator.style.opacity = "1";
    indicator.style.transform = `translateX(${link.offsetLeft}px) scaleX(${link.offsetWidth})`;
  }, [active]);

  // Mobile menu: Escape closes it and returns focus to the toggle.
  useEffect(() => {
    if (!open) return;
    const onKey = (e) => {
      if (e.key === "Escape") {
        setOpen(false);
        toggleRef.current?.focus();
      }
    };
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [open]);

  const toggleTheme = () => {
    const root = document.documentElement;
    const next = root.dataset.theme === "light" ? "dark" : "light";
    root.dataset.theme = next;
    try { localStorage.setItem("theme", next); } catch { /* storage unavailable */ }
  };

  const handle = name.split(" ")[0]?.toLowerCase() || "home";

  return (
    <header className={`navbar ${scrolled ? "scrolled" : ""} ${open ? "menu-open" : ""}`}>
      <a href="#top" className="nav-logo anim" style={{ "--d": "0ms" }} aria-label={`${name}, back to top`}>
        ~/<span>{handle}</span>
      </a>
      <nav className="nav-right" aria-label="Primary">
        <div className="nav-links-wrap" ref={listRef}>
          <ul className="nav-links">
            {links.map((l, i) => (
              <li key={l.id} className="anim" style={{ "--d": `${80 + i * 50}ms` }}>
                <a href={`#${l.id}`} aria-current={active === l.id ? "true" : undefined}>{l.label}</a>
              </li>
            ))}
          </ul>
          <span className="nav-indicator" ref={indicatorRef} aria-hidden="true" />
        </div>
        <button className="icon-btn theme-toggle anim" style={{ "--d": "350ms" }} onClick={toggleTheme} aria-label="Toggle light and dark theme">
          <span className="icon-sun"><Icon name="sun" /></span>
          <span className="icon-moon"><Icon name="moon" /></span>
        </button>
        <button
          ref={toggleRef}
          className="icon-btn hamburger"
          onClick={() => setOpen(!open)}
          aria-label={open ? "Close menu" : "Open menu"}
          aria-expanded={open}
          aria-controls="mobile-menu"
        >
          <span className="burger" aria-hidden="true"><i /><i /><i /></span>
        </button>
      </nav>
      <ul id="mobile-menu" className={`mobile-menu ${open ? "open" : ""}`}>
        {links.map((l, i) => (
          <li key={l.id} style={{ "--i": i }}>
            <a href={`#${l.id}`} onClick={() => setOpen(false)} tabIndex={open ? 0 : -1}>
              <span className="mono">0{i + 1}</span> {l.label}
            </a>
          </li>
        ))}
      </ul>
    </header>
  );
}
