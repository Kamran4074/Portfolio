import SectionHead from "./SectionHead";
import Timeline, { dateRange } from "./Timeline";

export default function Experience({ index, items }) {
  const entries = items.map((job) => ({
    // Keys from content (not _id) so the pre-rendered nodes survive the swap to live API data.
    key: `${job.company}-${job.role}`,
    title: job.role,
    subtitle: [job.company, job.location].filter(Boolean).join(" · "),
    date: dateRange(job.start, job.end),
    points: job.points,
    chips: job.tech,
  }));

  return (
    <section className="section section-alt" id="experience" aria-labelledby="experience-title">
      <div className="container">
        <SectionHead id="experience" index={index} label="experience" title="Where I've worked" />
        <Timeline items={entries} />
      </div>
    </section>
  );
}
