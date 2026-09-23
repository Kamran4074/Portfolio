import Icon from "./Icon";
import SectionHead from "./SectionHead";

export default function Certifications({ certifications, achievements }) {
  return (
    <section className="section" id="certifications">
      <div className="container">
        <SectionHead index={5} label="credentials" title="Certifications & achievements" />
        <div className="two-col">
          {certifications.length > 0 && (
            <div>
              <h3 className="col-title">Certifications</h3>
              {certifications.map((c) => {
                const body = (
                  <>
                    <div>
                      <strong>{c.title}</strong>
                      {c.issuer && <small>{c.issuer}</small>}
                    </div>
                    {c.url && <Icon name="external" size={14} />}
                  </>
                );
                return c.url ? (
                  <a key={c._id || c.title} href={c.url} className="list-card" target="_blank" rel="noreferrer">{body}</a>
                ) : (
                  <div key={c._id || c.title} className="list-card">{body}</div>
                );
              })}
            </div>
          )}
          {achievements.length > 0 && (
            <div>
              <h3 className="col-title">Achievements</h3>
              {achievements.map((a) => (
                <div key={a._id || a.text} className="list-card"><p>{a.text}</p></div>
              ))}
            </div>
          )}
        </div>
      </div>
    </section>
  );
}
