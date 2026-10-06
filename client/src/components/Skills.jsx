import Icon, { skillIconFor } from "./Icon";
import SectionHead from "./SectionHead";

export default function Skills({ index, items }) {
  return (
    <section className="section section-alt" id="skills" aria-labelledby="skills-title">
      <div className="container">
        <SectionHead id="skills" index={index} label="skills" title="Technical skills" />
        <div className="skills-grid" data-stagger>
          {items.map((g) => (
            <div className="skill-group" key={g.title} data-glow>
              <div className="skill-head">
                <span className="skill-icon" aria-hidden="true"><Icon name={skillIconFor(g.title)} size={18} /></span>
                <h3>{g.title}</h3>
              </div>
              <ul className="chips" aria-label={`${g.title} skills`}>
                {g.items?.map((t) => <li className="chip" key={t}>{t}</li>)}
              </ul>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
