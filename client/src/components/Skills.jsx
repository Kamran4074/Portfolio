const skills = [
  { icon: "🖥", title: "Frontend", tags: ["React.js", "HTML5", "CSS3", "Tailwind CSS", "Recharts"] },
  { icon: "⚙️", title: "Backend", tags: ["Node.js", "Express.js", "REST API", "Socket.IO"] },
  { icon: "🗄", title: "Database", tags: ["MongoDB", "MongoDB Atlas", "Mongoose"] },
  { icon: "🔐", title: "Security", tags: ["JWT", "bcrypt", "HTTP-only Cookies", "express-validator"] },
  { icon: "🛠", title: "Tools", tags: ["Git", "GitHub", "Postman", "VS Code", "Axios", "npm"] },
  { icon: "💡", title: "Languages", tags: ["JavaScript", "Java"] },
];

export default function Skills() {
  return (
    <section className="section section-dark" id="skills">
      <div className="container">
        <h2 className="section-title">Technical Skills</h2>
        <div className="skills-grid">
          {skills.map((s) => (
            <div className="skill-card" key={s.title}>
              <div className="skill-icon">{s.icon}</div>
              <h3>{s.title}</h3>
              <div className="tags">
                {s.tags.map((t) => <span key={t}>{t}</span>)}
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
