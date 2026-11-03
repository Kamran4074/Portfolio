import { lazy, Suspense } from "react";
import Icon from "../Icon";
import ProjectCover from "./ProjectCover";
import { shotsOf } from "./media";

// The gallery (and motion, ~40 KB gzip) is downloaded only when a project has one, so the
// first paint stays as light as before. Until it arrives the first screenshot is shown.
const ProjectGallery = lazy(() => import("./ProjectGallery"));

export default function ProjectCard({ project: p }) {
  const link = p.demoUrl || p.githubUrl;
  const shots = shotsOf(p);
  // Several screenshots, or one with a caption, get the gallery; otherwise a linked cover.
  const gallery = shots.length > 1 || Boolean(shots[0]?.caption);

  return (
    <article className={`project ${p.featured ? "featured" : ""} ${gallery ? "has-gallery" : ""}`}>
      {gallery ? (
        <Suspense fallback={<ProjectCover project={p} shot={shots[0]} link={link} />}>
          <ProjectGallery project={p} shots={shots} />
        </Suspense>
      ) : (
        <ProjectCover project={p} shot={shots[0]} link={link} />
      )}
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
  );
}
