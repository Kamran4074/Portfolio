import Icon from "./Icon";
import SectionHead from "./SectionHead";

const slug = (s = "") => s.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");
const host = (url = "") => {
  try { return new URL(url).host; } catch { return ""; }
};

// Real screenshot when one is set in /settings, otherwise a generated cover in the site's style.
function Cover({ p }) {
  const link = p.demoUrl || p.githubUrl;
  const inner = p.image ? (
    <img
      src={p.image}
      alt={p.imageAlt || `Screenshot of ${p.title}`}
      width="1200"
      height="750"
      loading="lazy"
      decoding="async"
    />
  ) : (
    <div className="cover-gen" aria-hidden="true">
      <div className="cover-bar"><i /><i /><i /><span>{host(p.demoUrl) || `~/projects/${slug(p.title)}`}</span></div>
      <p className="cover-title">{p.title}</p>
      <p className="cover-route mono">GET /api/{slug(p.subtitle || p.title)}<span className="t-ok"> 200</span></p>
    </div>
  );

  const content = (
    <>
      <div className="project-cover-inner">{inner}</div>
      {link && (
        <span className="cover-overlay" aria-hidden="true">
          View project <Icon name="arrow" size={14} />
        </span>
      )}
    </>
  );

  return link ? (
    <a
      href={link}
      className="project-cover"
      target="_blank"
      rel="noreferrer"
      data-mask
      data-cursor="View project"
      aria-label={`Open ${p.title}${p.demoUrl ? " live demo" : " on GitHub"}`}
    >
      {content}
    </a>
  ) : (
    <div className="project-cover" data-mask>{content}</div>
  );
}

export default function Projects({ index, items, profile }) {
  const github = profile.socials?.find((s) => /github/i.test(s.label))?.url;

  return (
    <section className="section" id="projects" aria-labelledby="projects-title">
      <div className="container">
        <SectionHead
          id="projects"
          index={index}
          label="projects"
          title="Things I've built"
          sub="Full stack projects with the weight on the backend: authentication, data modeling and API design."
        />
        <div className="projects-grid" data-stagger>
          {items.map((p) => (
            <article className={`project ${p.featured ? "featured" : ""}`} key={p.title}>
              <Cover p={p} />
              <div className="project-body">
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
                <ul className="chips" aria-label="Technologies">
                  {p.tech?.map((t) => <li className="chip" key={t}>{t}</li>)}
                </ul>
                {(p.demoUrl || p.githubUrl) && (
                  <div className="project-links">
                    {p.demoUrl && (
                      <a href={p.demoUrl} className="btn btn-primary btn-sm" target="_blank" rel="noreferrer">
                        Live demo <span className="btn-arrow"><Icon name="arrow" size={13} /></span>
                      </a>
                    )}
                    {p.githubUrl && (
                      <a href={p.githubUrl} className="btn btn-outline btn-sm" target="_blank" rel="noreferrer">
                        <Icon name="github" size={14} /> Code
                      </a>
                    )}
                  </div>
                )}
              </div>
            </article>
          ))}
        </div>
        {github && (
          <a href={`${github}?tab=repositories`} className="more-link" target="_blank" rel="noreferrer" data-reveal>
            More on GitHub <span className="btn-arrow"><Icon name="arrow" size={14} /></span>
          </a>
        )}
      </div>
    </section>
  );
}
