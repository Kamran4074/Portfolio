import Icon, { iconFor } from "./Icon";

export default function Footer({ profile }) {
  return (
    <footer className="footer">
      <div className="footer-inner">
        <p>
          © {new Date().getFullYear()} {profile.name} · {profile.title?.split("·")[0].trim()}
        </p>
        <ul className="footer-links">
          {profile.socials?.map((s) => (
            <li key={s.label}>
              <a href={s.url} target="_blank" rel="noreferrer me" aria-label={s.label}>
                <Icon name={iconFor(s.label)} size={15} />
              </a>
            </li>
          ))}
          <li>
            <a href="#top" className="to-top">Back to top <Icon name="arrowUp" size={14} /></a>
          </li>
        </ul>
      </div>
    </footer>
  );
}
