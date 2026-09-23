import SectionHead from "./SectionHead";

export default function Experience({ items }) {
  return (
    <section className="section section-alt" id="experience">
      <div className="container">
        <SectionHead index={2} label="experience" title="Where I've worked" />
        <div className="timeline">
          {items.map((job) => (
            <article className="job" key={job._id || `${job.company}-${job.role}`}>
              <div className="job-head">
                <div>
                  <h3 className="job-role">{job.role}</h3>
                  <p className="job-company">{job.company}{job.location ? ` · ${job.location}` : ""}</p>
                </div>
                <span className="job-date">{[job.start, job.end].filter(Boolean).join(" → ")}</span>
              </div>
              <ul className="points">
                {job.points?.map((p, i) => <li key={i}>{p}</li>)}
              </ul>
              <div className="chips">
                {job.tech?.map((t) => <span className="chip" key={t}>{t}</span>)}
              </div>
            </article>
          ))}
        </div>
      </div>
    </section>
  );
}
