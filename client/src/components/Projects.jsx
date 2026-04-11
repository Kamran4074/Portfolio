// Portfolio - Kamran Alam
const projects = [
  {
    emoji: "💰",
    gradient: "linear-gradient(135deg,#6366f1,#8b5cf6)",
    title: "SmartExpense",
    sub: "Personal Finance Tracker",
    desc: "Full-stack expense management app supporting 500+ transactions with sub-200ms REST API response times. Dynamic financial dashboards with 5+ chart types using Recharts.",
    tags: ["MERN", "JWT", "Recharts", "bcrypt"],
    demo: "https://expense-tracker-alpha-fawn.vercel.app/",
  },
  {
    emoji: "💬",
    gradient: "linear-gradient(135deg,#06b6d4,#3b82f6)",
    title: "Real-Time Secure Chat",
    sub: "Chat Application",
    desc: "Real-time chat app using Socket.IO for bidirectional communication, supporting 50+ concurrent users. JWT auth with HTTP-only cookies eliminates unauthorized access vectors.",
    tags: ["MERN", "Socket.IO", "JWT", "HTTP-only Cookies"],
    demo: "https://chatwave-azure.vercel.app/",
  },
  {
    emoji: "✅",
    gradient: "linear-gradient(135deg,#10b981,#059669)",
    title: "Task Manager",
    sub: "Task Management App",
    desc: "Full-stack task manager with complete CRUD, managing 100+ tasks per user. Filtering across 3 priority levels and 4 status states with a fully responsive Tailwind UI.",
    tags: ["MERN", "Tailwind CSS", "express-validator", "JWT"],
    demo: "https://task-manager-two-theta-87.vercel.app",
  },
];

export default function Projects() {
  return (
    <section className="section" id="projects">
      <div className="container">
        <h2 className="section-title">Projects</h2>
        <div className="projects-grid">
          {projects.map((p) => (
            <div className="project-card" key={p.title}>
              <div className="project-header" style={{ background: p.gradient }}>
                <span className="project-emoji">{p.emoji}</span>
              </div>
              <div className="project-body">
                <h3>{p.title}</h3>
                <p className="project-sub">{p.sub}</p>
                <p className="project-desc">{p.desc}</p>
                <div className="tags">
                  {p.tags.map((t) => <span key={t}>{t}</span>)}
                </div>
                <div className="project-links">
                  {p.demo && (
                    <a href={p.demo} className="btn btn-sm" target="_blank" rel="noreferrer">
                      Live Demo
                    </a>
                  )}
                </div>
              </div>
            </div>
          ))}
          <a
            href="https://github.com/Kamran4074?tab=repositories"
            target="_blank"
            rel="noreferrer"
            className="project-card project-more"
          >
            <span className="project-more-plus">+</span>
            <p>View More on GitHub</p>
          </a>
        </div>
      </div>
    </section>
  );
}
