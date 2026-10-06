import SectionHead from "./SectionHead";
import Timeline, { dateRange } from "./Timeline";

export default function Education({ index, items }) {
  const entries = items.map((e) => ({
    key: `${e.institution}-${e.degree}`,
    title: [e.degree, e.field].filter(Boolean).join(" in "),
    subtitle: [e.institution, e.location, e.grade].filter(Boolean).join(" · "),
    date: dateRange(e.start, e.end),
    points: e.details,
  }));

  return (
    <section className="section" id="education" aria-labelledby="education-title">
      <div className="container">
        <SectionHead id="education" index={index} label="education" title="Education" />
        <Timeline items={entries} />
      </div>
    </section>
  );
}
