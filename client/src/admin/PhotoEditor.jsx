import { useEffect, useRef, useState } from "react";
import api, { errorMessage } from "../api";
import { DEFAULT_PHOTO, photoSrc } from "../components/About";
import { toSquarePhoto } from "./image";

// Upload, preview and remove the profile photo. Shown at the top of the Profile tab.
export default function PhotoEditor({ profile, onChange, notify }) {
  const [pending, setPending] = useState(null); // { blob, url } waiting for "Save photo"
  const [busy, setBusy] = useState(false);
  const [dragging, setDragging] = useState(false);
  const inputRef = useRef(null);

  // Free the preview's object URL when it is replaced or the editor closes.
  useEffect(() => () => pending && URL.revokeObjectURL(pending.url), [pending]);

  const pick = async (file) => {
    if (!file) return;
    setBusy(true);
    try {
      const blob = await toSquarePhoto(file);
      setPending({ blob, url: URL.createObjectURL(blob) });
    } catch (e) {
      notify(e.message, true);
    } finally {
      setBusy(false);
      if (inputRef.current) inputRef.current.value = ""; // allow picking the same file again
    }
  };

  const save = async () => {
    setBusy(true);
    try {
      const { data } = await api.put("/profile/photo", pending.blob, { headers: { "Content-Type": pending.blob.type } });
      onChange({ photoVersion: data.photoVersion });
      setPending(null);
      notify(`Photo updated (${Math.round(pending.blob.size / 1024)} KB)`);
    } catch (e) {
      notify(errorMessage(e), true);
    } finally {
      setBusy(false);
    }
  };

  const remove = async () => {
    if (!window.confirm("Remove the uploaded photo? The site will go back to the photo URL or the default photo.")) return;
    setBusy(true);
    try {
      await api.delete("/profile/photo");
      onChange({ photoVersion: undefined });
      notify("Uploaded photo removed");
    } catch (e) {
      notify(errorMessage(e), true);
    } finally {
      setBusy(false);
    }
  };

  const current = photoSrc(profile) || DEFAULT_PHOTO;
  const source = profile.photoVersion ? "Uploaded photo" : profile.photoUrl ? "From photo URL" : "Default photo";

  return (
    <div className="admin-card photo-editor">
      <div
        className={`photo-drop ${dragging ? "is-dragging" : ""}`}
        onDragOver={(e) => { e.preventDefault(); setDragging(true); }}
        onDragLeave={() => setDragging(false)}
        onDrop={(e) => { e.preventDefault(); setDragging(false); pick(e.dataTransfer.files?.[0]); }}
      >
        <img src={pending?.url || current} alt="Profile photo preview" width="140" height="140" />
        {pending && <span className="photo-badge">Preview</span>}
      </div>

      <div className="photo-body">
        <h3>Profile photo</h3>
        <p className="muted">
          {pending ? "This is how it will look. Save to publish it." : `${source}. Drop an image on the photo or choose one.`}
        </p>
        <small className="hint">Any JPEG, PNG or WebP. It is cropped to a square and resized to 480×480 automatically.</small>

        <div className="admin-form-actions">
          <input ref={inputRef} type="file" accept="image/jpeg,image/png,image/webp" hidden onChange={(e) => pick(e.target.files?.[0])} />
          {pending ? (
            <>
              <button type="button" className="btn btn-primary" onClick={save} disabled={busy}>{busy ? "Uploading…" : "Save photo"}</button>
              <button type="button" className="btn btn-outline" onClick={() => setPending(null)} disabled={busy}>Cancel</button>
            </>
          ) : (
            <>
              <button type="button" className="btn btn-primary" onClick={() => inputRef.current?.click()} disabled={busy}>
                {busy ? "Processing…" : "Choose photo"}
              </button>
              {profile.photoVersion && (
                <button type="button" className="btn btn-danger" onClick={remove} disabled={busy}>Remove uploaded photo</button>
              )}
            </>
          )}
        </div>
      </div>
    </div>
  );
}
