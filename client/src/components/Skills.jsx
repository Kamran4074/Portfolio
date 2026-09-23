import SectionHead from "./SectionHead";

export default function Skills({ items }) {
  return (
    <section className="section section-alt" id="skills">
      <div className="container">
        <SectionHead index={4} label="skills" title="Technical skills" />
        <div className="skills-grid">
          {items.map((g) => (
            <div className="skill-group" key={g._id || g.title}>
              <h3>{g.title.toLowerCase()}</h3>
              <div className="chips">
                {g.items?.map((t) => <span className="chip" key={t}>{t}</span>)}
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
