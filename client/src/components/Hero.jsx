import Icon, { iconFor } from "./Icon";

const K = ({ children }) => <span className="t-key">"{children}"</span>;
const S = ({ children }) => <span className="t-str">"{children}"</span>;
const escapeRe = (s) => s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");

// A fake API response built from real profile data: the "backend engineer" hook.
// Each line is its own element so it can stream in like a real response.
function Terminal({ profile, skills }) {
  const stack = (skills.find((s) => /backend/i.test(s.title))?.items || []).slice(0, 4);
  const dbs = (skills.find((s) => /database/i.test(s.title))?.items || []).slice(0, 3);
  const arr = (items) =>
    items.map((v, i) => (
      <span key={v}><S>{v}</S>{i < items.length - 1 ? ", " : ""}</span>
    ));

  const lines = [
    <><span className="t-prompt">$</span> curl -s api.{profile.name.split(" ")[0].toLowerCase()}.dev/v1/me</>,
    <><span className="t-muted">HTTP/1.1 </span><span className="t-ok">200 OK</span><span className="t-muted">  · application/json</span></>,
    " ",
    "{",
    <>  <K>name</K>: <S>{profile.name}</S>,</>,
    <>  <K>role</K>: <S>{profile.title.split("·")[0].trim()}</S>,</>,
    <>  <K>location</K>: <S>{profile.location?.split(",")[0]}</S>,</>,
    <>  <K>stack</K>: [{arr(stack)}],</>,
    <>  <K>databases</K>: [{arr(dbs)}],</>,
    <>  <K>openToWork</K>: <span className="t-bool">{String(!!profile.available)}</span></>,
    "}",
  ];

  return (
    <figure className="terminal anim anim-terminal" style={{ "--d": "650ms" }} data-parallax="-40">
      <div className="terminal-bar" aria-hidden="true"><i /><i /><i /><span>bash</span></div>
      <pre aria-label={`${profile.name}'s profile as a JSON API response`}>
        {lines.map((line, i) => (
          <span className="t-line" key={i} style={{ "--d": `${850 + i * 55}ms` }}>{line}</span>
        ))}
      </pre>
    </figure>
  );
}

// Wraps technology names that appear in the tagline so they get a subtle highlight.
// Terms come from the skills list, so the highlight follows whatever is edited in /settings.
function Tagline({ text = "", skills }) {
  const terms = [
    ...new Set(skills.flatMap((g) => g.items || []).flatMap((s) => [s, s.replace(/\.js$/i, "")]).filter((s) => s.length > 2)),
  ].sort((a, b) => b.length - a.length);
  if (!terms.length) return text;

  // \b rather than a lookbehind: lookbehind throws on Safari < 16.4 and would break the page.
  const re = new RegExp(`\\b(${terms.map(escapeRe).join("|")})\\b`, "g");
  let n = 0;
  return text.split(re).map((part, i) =>
    i % 2 === 1 && n < 6 ? (
      <span className="kw" key={i} style={{ "--d": `${1100 + n++ * 120}ms` }}>{part}</span>
    ) : (
      part
    )
  );
}

export default function Hero({ profile, skills }) {
  const [first, ...rest] = profile.name.split(" ");

  return (
    <section className="hero" id="top" aria-labelledby="hero-title">
      <div className="hero-bg" aria-hidden="true">
        <div className="hero-grid-bg" />
        <div className="hero-glow" data-parallax="60" />
        <div className="hero-spot" />
      </div>
      <div className="container hero-grid">
        <div className="hero-copy">
          {profile.available && (
            <p className="status-pill anim" style={{ "--d": "120ms" }}>
              <span className="status-dot" aria-hidden="true" />open to backend / full stack roles
            </p>
          )}
          <h1 className="hero-heading" id="hero-title">
            <span className="line">
              <span className="line-inner" style={{ "--d": "220ms" }}>
                <span className="hero-name">{first}</span>{" "}
                <span className="hero-name hero-name-accent">{rest.join(" ")}</span>
              </span>
            </span>
            <span className="line">
              <span className="line-inner hero-role" style={{ "--d": "380ms" }}>{profile.title}</span>
            </span>
          </h1>
          <p className="hero-sub anim anim-blur" style={{ "--d": "520ms" }}>
            <Tagline text={profile.tagline} skills={skills} />
          </p>
          <div className="hero-btns anim" style={{ "--d": "640ms" }}>
            <a href="#projects" className="btn btn-primary" data-magnetic>
              View my work <span className="btn-arrow"><Icon name="arrow" size={15} /></span>
            </a>
            {profile.resumeUrl && (
              <a href={profile.resumeUrl} className="btn btn-outline" target="_blank" rel="noreferrer">
                <Icon name="file" /> Resume
              </a>
            )}
            <a href="#contact" className="btn btn-outline">Contact</a>
          </div>
          <ul className="socials" aria-label="Profiles">
            {profile.socials?.map((s, i) => (
              <li key={s.label} className="anim" style={{ "--d": `${760 + i * 60}ms` }}>
                <a href={s.url} className="social" target="_blank" rel="noreferrer me">
                  <Icon name={iconFor(s.label)} size={14} /> {s.label}
                </a>
              </li>
            ))}
          </ul>
        </div>
        <Terminal profile={profile} skills={skills} />
      </div>
      <a href="#about" className="scroll-cue anim" style={{ "--d": "1400ms" }} aria-label="Scroll to About">
        <span />
      </a>
    </section>
  );
}
