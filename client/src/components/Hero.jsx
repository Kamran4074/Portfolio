import Icon, { iconFor } from "./Icon";

const K = ({ children }) => <span className="t-key">"{children}"</span>;
const S = ({ children }) => <span className="t-str">"{children}"</span>;

// A fake API response built from real profile data: the "backend engineer" hook.
function Terminal({ profile, skills }) {
  const stack = (skills.find((s) => /backend/i.test(s.title))?.items || []).slice(0, 4);
  const dbs = (skills.find((s) => /database/i.test(s.title))?.items || []).slice(0, 3);
  const arr = (items) =>
    items.map((v, i) => (
      <span key={v}><S>{v}</S>{i < items.length - 1 ? ", " : ""}</span>
    ));

  return (
    <div className="terminal" aria-label="Profile as an API response">
      <div className="terminal-bar"><i /><i /><i /><span>bash</span></div>
      <pre>
        <span className="t-prompt">$</span> curl -s api.{profile.name.split(" ")[0].toLowerCase()}.dev/v1/me{"\n"}
        <span className="t-muted">HTTP/1.1 </span><span className="t-ok">200 OK</span><span className="t-muted">  · application/json</span>{"\n\n"}
        {"{\n"}
        {"  "}<K>name</K>: <S>{profile.name}</S>,{"\n"}
        {"  "}<K>role</K>: <S>{profile.title.split("·")[0].trim()}</S>,{"\n"}
        {"  "}<K>location</K>: <S>{profile.location?.split(",")[0]}</S>,{"\n"}
        {"  "}<K>stack</K>: [{arr(stack)}],{"\n"}
        {"  "}<K>databases</K>: [{arr(dbs)}],{"\n"}
        {"  "}<K>openToWork</K>: <span className="t-bool">{String(!!profile.available)}</span>{"\n"}
        {"}"}
      </pre>
    </div>
  );
}

export default function Hero({ profile, skills }) {
  return (
    <section className="hero" id="top">
      <div className="container hero-grid">
        <div>
          {profile.available && (
            <div className="status-pill"><span className="status-dot" />open to backend / full stack roles</div>
          )}
          <h1 className="hero-name">{profile.name}</h1>
          <p className="hero-title">{profile.title}</p>
          <p className="hero-sub">{profile.tagline}</p>
          <div className="hero-btns">
            <a href="#projects" className="btn btn-primary">View my work</a>
            {profile.resumeUrl && (
              <a href={profile.resumeUrl} className="btn btn-outline" target="_blank" rel="noreferrer">
                <Icon name="file" /> Resume
              </a>
            )}
            <a href="#contact" className="btn btn-outline">Contact</a>
          </div>
          <div className="socials">
            {profile.socials?.map((s) => (
              <a key={s.label} href={s.url} className="social" target="_blank" rel="noreferrer">
                <Icon name={iconFor(s.label)} size={14} /> {s.label}
              </a>
            ))}
          </div>
        </div>
        <Terminal profile={profile} skills={skills} />
      </div>
    </section>
  );
}
