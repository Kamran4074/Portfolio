import Icon from "../Icon";
import { altOf, host, SHOT_SIZES, slug } from "./media";

// One screenshot (or a generated cover in the site's style), linking to the project.
export default function ProjectCover({ project: p, shot, link }) {
  const inner = shot ? (
    <img src={shot.src} srcSet={shot.srcSet} sizes={shot.srcSet ? SHOT_SIZES : undefined} alt={altOf(p, shot)} width="1200" height="750" loading="lazy" decoding="async" />
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
