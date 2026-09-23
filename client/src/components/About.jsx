import localPhoto from "../assets/passport photo2.jpeg";
import SectionHead from "./SectionHead";

export default function About({ profile }) {
  return (
    <section className="section" id="about">
      <div className="container">
        <SectionHead index={1} label="about" title="About me" />
        <div className="about-grid">
          <img src={profile.photoUrl || localPhoto} alt={profile.name} className="avatar" loading="lazy" />
          <div className="about-text">
            {profile.about?.map((p, i) => <p key={i}>{p}</p>)}
            {profile.focus?.length > 0 && (
              <div className="chips focus">
                {profile.focus.map((f) => <span className="chip" key={f}>{f}</span>)}
              </div>
            )}
            <div className="stats">
              {profile.stats?.map((s) => {
                const body = (
                  <>
                    <div className="stat-value">{s.value}</div>
                    <div className="stat-label">{s.label}</div>
                  </>
                );
                return s.url ? (
                  <a key={s.label} href={s.url} className="stat" target="_blank" rel="noreferrer">{body}</a>
                ) : (
                  <div key={s.label} className="stat">{body}</div>
                );
              })}
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
