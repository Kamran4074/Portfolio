import { useState, useEffect } from "react";

const links = ["About", "Skills", "Projects", "Certifications", "Contact"];

export default function Navbar() {
  const [scrolled, setScrolled] = useState(false);
  const [open, setOpen] = useState(false);

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 40);
    window.addEventListener("scroll", onScroll);
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  const handleNav = (id) => {
    document.getElementById(id.toLowerCase())?.scrollIntoView({ behavior: "smooth" });
    setOpen(false);
  };

  return (
    <>
      <nav className={`navbar ${scrolled ? "scrolled" : ""}`}>
        <a href="#hero" className="nav-logo">KA</a>
        <ul className="nav-links">
          {links.map((l) => (
            <li key={l}><a href={`#${l.toLowerCase()}`}>{l}</a></li>
          ))}
        </ul>
        <button className="hamburger" onClick={() => setOpen(!open)}>☰</button>
      </nav>
      <ul className={`mobile-menu ${open ? "open" : ""}`}>
        {links.map((l) => (
          <li key={l}><a href={`#${l.toLowerCase()}`} onClick={() => handleNav(l)}>{l}</a></li>
        ))}
      </ul>
    </>
  );
}
