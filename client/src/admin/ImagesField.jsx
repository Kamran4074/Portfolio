import { useRef, useState } from "react";
import api, { errorMessage } from "../api";
import { pad, shotSrc } from "../components/projects/media";
import { toScreenshot } from "./image";

const CAPTION_MAX = 200;

// Upload, caption, reorder and remove a project's screenshots. Each file is resized in the
// browser and uploaded right away; the form's Save then stores the list on the project.
// `shots` is [{ id, caption }].
export default function ImagesField({ field, shots, onChange, onBusy }) {
  const [status, setStatus] = useState(null); // { text, error }
  const [dragging, setDragging] = useState(false);
  const inputRef = useRef(null);
  const max = field.max;
  const room = max - shots.length;

  const add = async (fileList) => {
    const files = Array.from(fileList || []);
    if (!files.length) return;
    if (room <= 0) return setStatus({ text: `Already ${max} screenshots. Remove one first.`, error: true });
    const picked = files.slice(0, room);

    onBusy(true);
    const added = [];
    const has = (id) => shots.some((s) => s.id === id) || added.some((s) => s.id === id);
    try {
      for (const [i, file] of picked.entries()) {
        setStatus({ text: `Uploading ${i + 1} of ${picked.length}…` });
        const { large, small } = await toScreenshot(file);
        const upload = (blob) => api.post("/screenshots", blob, { headers: { "Content-Type": blob.type } }).then((r) => r.data.id);
        const id = await upload(large);
        const thumb = small ? await upload(small) : undefined;
        if (!has(id)) added.push({ id, ...(thumb && { thumb }), caption: "" });
      }
      const skipped = files.length - picked.length;
      setStatus({ text: `Added ${added.length}.${skipped ? ` ${skipped} skipped (max ${max}).` : ""} Add captions, then Save to publish.` });
    } catch (e) {
      // Resize errors already read well; network/server errors go through errorMessage.
      setStatus({ text: e.isAxiosError ? errorMessage(e) : e.message, error: true });
    } finally {
      if (added.length) onChange([...shots, ...added]);
      onBusy(false);
      if (inputRef.current) inputRef.current.value = ""; // allow picking the same file again
    }
  };

  const move = (i, d) => {
    const next = [...shots];
    [next[i], next[i + d]] = [next[i + d], next[i]];
    onChange(next);
  };
  const setCaption = (i, caption) => onChange(shots.map((s, j) => (j === i ? { ...s, caption } : s)));

  return (
    <div
      className={`shots ${dragging ? "is-dragging" : ""}`}
      onDragOver={(e) => { e.preventDefault(); setDragging(true); }}
      onDragLeave={() => setDragging(false)}
      onDrop={(e) => { e.preventDefault(); setDragging(false); add(e.dataTransfer.files); }}
    >
      <ul className="shots-grid">
        {shots.map((s, i) => (
          <li key={s.id} className="shot">
            <img src={shotSrc(s.thumb || s.id)} alt={s.caption || `Screenshot ${i + 1}`} loading="lazy" />
            <span className="photo-badge">{i === 0 ? "Cover" : pad(i + 1)}</span>
            <input
              className="shot-caption"
              placeholder="Caption, shown under the picture"
              aria-label={`Caption for screenshot ${i + 1}`}
              maxLength={CAPTION_MAX}
              value={s.caption}
              onChange={(e) => setCaption(i, e.target.value)}
            />
            <div className="shot-actions">
              <button type="button" className="btn btn-outline btn-sm" onClick={() => move(i, -1)} disabled={i === 0} aria-label="Move left">←</button>
              <button type="button" className="btn btn-outline btn-sm" onClick={() => move(i, 1)} disabled={i === shots.length - 1} aria-label="Move right">→</button>
              <button type="button" className="btn btn-danger btn-sm" onClick={() => onChange(shots.filter((x) => x.id !== s.id))} aria-label="Remove">✕</button>
            </div>
          </li>
        ))}
        {room > 0 && (
          <li>
            <button type="button" className="shot-add" onClick={() => inputRef.current?.click()}>
              <span>+ Add screenshots</span>
              <small>{shots.length} / {max}</small>
            </button>
          </li>
        )}
      </ul>
      <input ref={inputRef} id={`f-${field.name}`} type="file" accept="image/jpeg,image/png,image/webp" multiple hidden onChange={(e) => add(e.target.files)} />
      {status && <p className={`form-msg ${status.error ? "err" : ""}`}>{status.text}</p>}
    </div>
  );
}
