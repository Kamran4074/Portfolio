export default function SectionHead({ index, label, title, sub }) {
  return (
    <div className="section-head">
      <p className="eyebrow">// {String(index).padStart(2, "0")}. {label}</p>
      <h2 className="section-title">{title}</h2>
      {sub && <p className="section-sub">{sub}</p>}
    </div>
  );
}
