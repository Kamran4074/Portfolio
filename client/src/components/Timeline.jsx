// Shared by Experience and Education. On scroll the line grows, then each entry's node
// appears, followed by its title, subtitle, body and badges (see motion.js).
export default function Timeline({ items }) {
  return (
    <div className="timeline" data-timeline>
      <span className="timeline-line" aria-hidden="true" />
      <ol className="tl-list">
        {items.map((item) => (
          <li className="tl-item" key={item.key}>
            <span className="tl-node" aria-hidden="true" />
            <article className="tl-card">
              <header className="tl-head">
                <div>
                  <h3 className="tl-title" data-seq>{item.title}</h3>
                  <p className="tl-sub" data-seq>{item.subtitle}</p>
                </div>
                {item.date && <p className="tl-date" data-seq>{item.date}</p>}
              </header>
              {item.points?.length > 0 && (
                <ul className="points" data-seq>
                  {item.points.map((p, i) => <li key={i}>{p}</li>)}
                </ul>
              )}
              {item.chips?.length > 0 && (
                <ul className="chips" aria-label="Technologies" data-seq>
                  {item.chips.map((t) => <li className="chip" key={t}>{t}</li>)}
                </ul>
              )}
            </article>
          </li>
        ))}
      </ol>
    </div>
  );
}

export const dateRange = (start, end) => [start, end].filter(Boolean).join(" → ");
