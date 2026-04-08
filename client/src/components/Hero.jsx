export default function Hero() {
  return (
    <section className="hero" id="hero">
      <div className="hero-blob" />
      <div style={{ position: "relative", zIndex: 1 }}>
        <div className="hero-badge">
          <span className="hero-badge-dot" />
          Available for opportunities
        </div>
        <p className="hero-greeting">Hi there, I'm</p>
        <h1 className="hero-name">Kamran Alam</h1>
        <h2 className="hero-title">MERN Stack Developer</h2>
        <p className="hero-sub">
          Building full-stack web apps with MongoDB, Express, React &amp; Node.js
        </p>
        <div className="hero-btns">
          <a href="#projects" className="btn btn-primary">View Projects</a>
          <a href="#contact" className="btn btn-outline">Contact Me</a>
        </div>
        <div className="hero-socials">
          <a href="mailto:kamran.alam.work@gmail.com" title="Email">✉</a>
          <a href="https://www.linkedin.com/in/kamran-alam-73017kam/" target="_blank" rel="noreferrer" title="LinkedIn">in</a>
          <a href="https://github.com/Kamran4074" target="_blank" rel="noreferrer" title="GitHub">GH</a>
          <a href="https://leetcode.com/u/Kammykamran/" target="_blank" rel="noreferrer" title="LeetCode">LC</a>
          <a href="https://www.geeksforgeeks.org/user/kammykamran49fy/" target="_blank" rel="noreferrer" title="GeeksforGeeks">GFG</a>
        </div>
      </div>
    </section>
  );
}
