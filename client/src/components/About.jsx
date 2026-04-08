import profilePic from "../assets/passport photo2.jpeg";

export default function About() {
  return (
    <section className="section" id="about">
      <div className="container">
        <h2 className="section-title">About Me</h2>
        <div className="about-grid">
          <div className="about-avatar">
            <div className="avatar-glow" />
            <div className="avatar-ring">
              <img src={profilePic} alt="Kamran Alam" className="avatar-img" />
            </div>
          </div>
          <div className="about-text">
            <p>
              I'm a <strong>MERN Stack Developer</strong> currently pursuing B.Tech in Computer
              Science at <strong>Galgotias University</strong> (CGPA: 7.8). I build
              production-ready full-stack applications with a strong focus on security,
              performance, and clean architecture.
            </p>
            <p>
              Proficient in <strong>REST API development</strong>,{" "}
              <strong>JWT-based authentication</strong>, real-time systems with{" "}
              <strong>Socket.IO</strong>, and security-aware coding practices including bcrypt
              password hashing and input validation.
            </p>
            <div className="about-stats">
              <div className="stat"><span>195+</span><p>DSA Problems</p></div>
              <div className="stat">
                <a href="https://github.com/Kamran4074" target="_blank" rel="noreferrer" style={{ textDecoration: "none" }}>
                  <span style={{ cursor: "pointer" }}>7+</span>
                </a>
                <p>
                  <a href="https://github.com/Kamran4074" target="_blank" rel="noreferrer" style={{ color: "var(--accent)", textDecoration: "none" }}>
                    Projects on GitHub ↗
                  </a>
                </p>
              </div>
              <div className="stat"><span>4</span><p>Certifications</p></div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
