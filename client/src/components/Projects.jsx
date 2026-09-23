import Icon from "./Icon";
import SectionHead from "./SectionHead";

export default function Projects({ items, github }) {
  return (
    <section className="section" id="projects">
      <div className="container">
        <SectionHead index={3} label="projects" title="Things I've built" sub="Focused on the backend: auth, data modeling and API design." />
        <div className="projects-grid">
          {items.map((p) => (
            <article className={`project ${p.featured ? "featured" : ""}`} key={p._id || p.title}>
              <div className="project-top">
                <div>
                  <h3>{p.title}</h3>
                  {p.subtitle && <p className="project-sub">{p.subtitle}</p>}
                </div>
                {p.featured && <span className="badge">featured</span>}
              </div>
              {p.description && <p className="project-desc">{p.description}</p>}
              {p.highlights?.length > 0 && (
                <ul className="points">
                  {p.highlights.map((h, i) => <li key={i}>{h}</li>)}
                </ul>
              )}
              <div className="chips">
                {p.tech?.map((t) => <span className="chip" key={t}>{t}</span>)}
              </div>
              {(p.demoUrl || p.githubUrl) && (
                <div className="project-links">
                  {p.demoUrl && (
                    <a href={p.demoUrl} className="btn btn-primary btn-sm" target="_blank" rel="noreferrer">
                      <Icon name="external" size={14} /> Live demo
                    </a>
                  )}
                  {p.githubUrl && (
                    <a href={p.githubUrl} className="btn btn-outline btn-sm" target="_blank" rel="noreferrer">
                      <Icon name="github" size={14} /> Code
                    </a>
                  )}
                </div>
              )}
            </article>
          ))}
        </div>
        {github && (
          <a href={`${github}?tab=repositories`} className="more-link" target="_blank" rel="noreferrer">
            More on GitHub <Icon name="external" size={14} />
          </a>
        )}
      </div>
    </section>
  );
}
