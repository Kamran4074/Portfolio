import { useState } from "react";
import { toForm, fromForm } from "./config";

function PairsField({ field, rows, onChange }) {
  const update = (i, key, value) => onChange(rows.map((r, j) => (j === i ? { ...r, [key]: value } : r)));
  const blank = Object.fromEntries(field.sub.map((s) => [s.name, ""]));

  return (
    <div className="pairs">
      {rows.map((row, i) => (
        <div className="pair-row" key={i}>
          {field.sub.map((s) => (
            <input key={s.name} placeholder={s.label} value={row[s.name] || ""} onChange={(e) => update(i, s.name, e.target.value)} />
          ))}
          <button type="button" className="btn btn-danger btn-sm" onClick={() => onChange(rows.filter((_, j) => j !== i))} aria-label="Remove">✕</button>
        </div>
      ))}
      <button type="button" className="btn btn-outline btn-sm" onClick={() => onChange([...rows, blank])}>+ Add</button>
    </div>
  );
}

export default function Form({ fields, doc, onSave, onCancel, saving }) {
  const [values, setValues] = useState(() => toForm(fields, doc));
  const set = (name, value) => setValues((v) => ({ ...v, [name]: value }));

  const submit = (e) => {
    e.preventDefault();
    onSave(fromForm(fields, values));
  };

  return (
    <form className="admin-form" onSubmit={submit}>
      {fields.map((f) => (
        <div className={`field ${f.type === "bool" ? "field-bool" : ""}`} key={f.name}>
          <label htmlFor={`f-${f.name}`}>{f.label}</label>
          {f.type === "textarea" || f.type === "lines" ? (
            <textarea id={`f-${f.name}`} rows={f.type === "lines" ? 5 : 3} value={values[f.name]} onChange={(e) => set(f.name, e.target.value)} />
          ) : f.type === "bool" ? (
            <input id={`f-${f.name}`} type="checkbox" checked={values[f.name]} onChange={(e) => set(f.name, e.target.checked)} />
          ) : f.type === "pairs" ? (
            <PairsField field={f} rows={values[f.name]} onChange={(rows) => set(f.name, rows)} />
          ) : (
            <input
              id={`f-${f.name}`}
              type={f.type === "number" ? "number" : f.type === "url" ? "url" : "text"}
              value={values[f.name]}
              onChange={(e) => set(f.name, e.target.value)}
            />
          )}
          {f.hint && <small className="hint">{f.hint}</small>}
        </div>
      ))}
      <div className="admin-form-actions">
        <button type="submit" className="btn btn-primary" disabled={saving}>{saving ? "Saving…" : "Save"}</button>
        {onCancel && <button type="button" className="btn btn-outline" onClick={onCancel}>Cancel</button>}
      </div>
    </form>
  );
}
