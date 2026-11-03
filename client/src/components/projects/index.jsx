// Projects section. Files in this folder:
//   ProjectCard     one project: media + text + links
//   ProjectCover    single screenshot or generated cover, linking to the project
//   ProjectGallery  horizontal screenshot strip with captions (motion)
//   Lightbox        full-screen viewer opened from the gallery
//   useDragScroll   mouse drag-to-scroll for the strip
//   media.js        pure helpers: screenshot URLs, alt text, formatting
import Icon from "../Icon";
import SectionHead from "../SectionHead";
import ProjectCard from "./ProjectCard";

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
          {items.map((p) => <ProjectCard key={p.title} project={p} />)}
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
