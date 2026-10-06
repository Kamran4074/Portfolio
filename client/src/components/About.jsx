import SectionHead from "./SectionHead";
import { apiUrl } from "../api";

export const DEFAULT_PHOTO = "/images/kamran-alam-480.jpg";

// Which photo to show, in order: uploaded in /settings, a pasted photo URL, the bundled one.
// The uploaded photo's URL carries its version, so browsers re-fetch only after a new upload.
export const photoSrc = (profile) =>
  profile.photoVersion ? apiUrl(`/profile/photo?v=${profile.photoVersion}`) : profile.photoUrl || null;

// "350+" -> { value: 350, prefix: "", suffix: "+" }. Non-numeric stats are shown as-is.
export const parseStat = (text = "") => {
  const m = String(text).match(/^(\D*)(\d+(?:\.\d+)?)(.*)$/);
  return m ? { prefix: m[1], value: Number(m[2]), suffix: m[3] } : null;
};

function Stat({ s }) {
  const parsed = parseStat(s.value);
  const body = (
    <>
      {/* The real value is in the HTML; the count-up only animates it when motion is on. */}
      <span className="stat-value" data-count={parsed ? "" : undefined}>{s.value}</span>
      <span className="stat-label">{s.label}</span>
    </>
  );
  return s.url ? (
    <a href={s.url} className="stat" target="_blank" rel="noreferrer">{body}</a>
  ) : (
    <div className="stat">{body}</div>
  );
}

export default function About({ index, profile }) {
  const custom = photoSrc(profile);
  return (
    <section className="section" id="about" aria-labelledby="about-title">
      <div className="container">
        <SectionHead id="about" index={index} label="about" title="About me" />
        <div className="about-grid">
          <div className="avatar-wrap" data-reveal>
            {custom ? (
              <img src={custom} alt={`Portrait of ${profile.name}`} className="avatar" width="220" height="220" loading="lazy" decoding="async" />
            ) : (
              <picture>
                <source srcSet="/images/kamran-alam-480.avif" type="image/avif" />
                <source srcSet="/images/kamran-alam-480.webp" type="image/webp" />
                <img src={DEFAULT_PHOTO} alt={`Portrait of ${profile.name}`} className="avatar" width="220" height="220" loading="lazy" decoding="async" />
              </picture>
            )}
            <span className="avatar-frame" aria-hidden="true" />
          </div>
          <div className="about-text">
            <div data-reveal>
              {profile.about?.map((p, i) => <p key={i}>{p}</p>)}
            </div>
            {profile.focus?.length > 0 && (
              <ul className="chips focus" aria-label="Focus areas" data-stagger>
                {profile.focus.map((f) => <li className="chip" key={f}>{f}</li>)}
              </ul>
            )}
            {profile.stats?.length > 0 && (
              <div className="stats" data-stagger>
                {profile.stats.map((s) => <Stat key={s.label} s={s} />)}
              </div>
            )}
          </div>
        </div>
      </div>
    </section>
  );
}
