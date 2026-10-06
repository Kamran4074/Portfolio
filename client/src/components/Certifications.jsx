import Icon from "./Icon";
import SectionHead from "./SectionHead";

export default function Certifications({ index, certifications, achievements }) {
  return (
    <section className="section" id="certifications" aria-labelledby="certifications-title">
      <div className="container">
        <SectionHead id="certifications" index={index} label="credentials" title="Certifications & achievements" />
        <div className="two-col">
          {certifications.length > 0 && (
            <div>
              <h3 className="col-title" data-reveal>Certifications</h3>
              <ul className="card-list" data-stagger>
                {certifications.map((c) => {
                  const body = (
                    <>
                      <span>
                        <strong>{c.title}</strong>
                        {c.issuer && <small>{c.issuer}</small>}
                      </span>
                      {c.url && <Icon name="external" size={14} />}
                    </>
                  );
                  return (
                    <li key={c.title}>
                      {c.url ? (
                        <a href={c.url} className="list-card" target="_blank" rel="noreferrer" aria-label={`${c.title}${c.issuer ? ` by ${c.issuer}` : ""}, view certificate`}>
                          {body}
                        </a>
                      ) : (
                        <div className="list-card">{body}</div>
                      )}
                    </li>
                  );
                })}
              </ul>
            </div>
          )}
          {achievements.length > 0 && (
            <div>
              <h3 className="col-title" data-reveal>Achievements</h3>
              <ul className="card-list" data-stagger>
                {achievements.map((a) => (
                  <li key={a.text} className="list-card"><p>{a.text}</p></li>
                ))}
              </ul>
            </div>
          )}
        </div>
      </div>
    </section>
  );
}
