// `id` becomes the heading id, so sections can use aria-labelledby={`${id}-title`}.
export default function SectionHead({ id, index, label, title, sub }) {
  return (
    <div className="section-head">
      <p className="eyebrow" data-reveal>// {String(index).padStart(2, "0")}. {label}</p>
      <h2 className="section-title" id={`${id}-title`} data-reveal>{title}</h2>
      {sub && <p className="section-sub" data-reveal>{sub}</p>}
    </div>
  );
}
