const certs = [
  {
    icon: "🛡",
    label: "Deloitte Cyber Job Simulation",
    href: "https://drive.google.com/file/d/1GDppkzxOAHniEEHk-temiTOmzZgTT-0r/view?usp=drive_link",
  },
  {
    icon: "⚛️",
    label: "Fundamentals of MERN Stack – Simplilearn SkillUp",
    href: "https://drive.google.com/file/d/1pTvB-M0Nc1xT62O2C4WHKEJ9KDNw-tD1/view?usp=drive_link",
  },
  {
    icon: "💻",
    label: "Full Stack Developer Virtual Internship",
    href: "https://your-link.com",
  },
  {
    icon: "📘",
    label: "NPTEL Software Engineering",
    href: "https://drive.google.com/file/d/17Ul4EOhXWimSdlNMuf1F3I-ystakzd2l/view?usp=drive_link",
  },
];

export default function Certifications() {
  return (
    <section className="section section-dark" id="certifications">
      <div className="container">
        <h2 className="section-title">Certifications</h2>
        <div className="cert-grid">
          {certs.map((c) => (
            <a
              key={c.label}
              href={c.href}
              target="_blank"
              rel="noreferrer"
              className="cert-card"
              style={{ textDecoration: "none" }}
            >
              <span>{c.icon}</span>
              <p>{c.label}</p>
            </a>
          ))}
        </div>
        <div className="achievement">
          <span>🏆</span>
          <p>
            Solved <strong>195+ DSA problems</strong> across LeetCode and GeeksforGeeks —
            consistently practicing arrays, trees, graphs, and dynamic programming.
          </p>
        </div>
      </div>
    </section>
  );
}
