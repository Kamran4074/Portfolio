import { useEffect, useState } from "react";
import api, { errorMessage } from "../api";

// Session lifetimes (access and refresh token) and "sign out everywhere".
// New lifetimes apply to the next login or refresh; current tokens keep their expiry.
export default function SecurityEditor({ notify, onSignedOut }) {
  const [settings, setSettings] = useState(null);
  const [values, setValues] = useState({ accessTokenMinutes: "", refreshTokenDays: "" });
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    api
      .get("/auth/settings")
      .then(({ data }) => {
        setSettings(data);
        setValues({ accessTokenMinutes: data.accessTokenMinutes, refreshTokenDays: data.refreshTokenDays });
      })
      .catch((e) => notify(errorMessage(e), true));
  }, [notify]);

  const set = (name) => (e) => setValues((v) => ({ ...v, [name]: e.target.value }));

  const save = async (e) => {
    e.preventDefault();
    setSaving(true);
    try {
      const { data } = await api.put("/auth/settings", {
        accessTokenMinutes: Number(values.accessTokenMinutes),
        refreshTokenDays: Number(values.refreshTokenDays),
      });
      setSettings(data);
      notify("Session settings saved. They apply from the next login or refresh.");
    } catch (err) {
      notify(errorMessage(err), true);
    } finally {
      setSaving(false);
    }
  };

  const signOutEverywhere = async () => {
    if (!window.confirm("Sign out every device, including this one?")) return;
    try {
      await api.post("/auth/logout-all");
      onSignedOut();
    } catch (err) {
      notify(errorMessage(err), true);
    }
  };

  if (!settings) return <p className="muted">Loading…</p>;
  const { limits } = settings;

  return (
    <>
      <form className="admin-form" onSubmit={save}>
        <div className="field">
          <label htmlFor="s-access">Access token lifetime (minutes)</label>
          <input
            id="s-access"
            type="number"
            min={limits.accessTokenMinutes.min}
            max={limits.accessTokenMinutes.max}
            value={values.accessTokenMinutes}
            onChange={set("accessTokenMinutes")}
            required
          />
          <small className="hint">
            {limits.accessTokenMinutes.min}–{limits.accessTokenMinutes.max}. Sent with every request; renewed automatically
            when it runs out. Shorter limits how long a leaked token works.
          </small>
        </div>
        <div className="field">
          <label htmlFor="s-refresh">Stay signed in for (days)</label>
          <input
            id="s-refresh"
            type="number"
            min={limits.refreshTokenDays.min}
            max={limits.refreshTokenDays.max}
            value={values.refreshTokenDays}
            onChange={set("refreshTokenDays")}
            required
          />
          <small className="hint">
            {limits.refreshTokenDays.min}–{limits.refreshTokenDays.max}. The refresh token, kept in a cookie scripts cannot
            read. Each use replaces it; reusing an old one signs that login out.
          </small>
        </div>
        <div className="admin-form-actions">
          <button type="submit" className="btn btn-primary" disabled={saving}>{saving ? "Saving…" : "Save"}</button>
        </div>
      </form>

      <div className="admin-card security-sessions">
        <h3>Active sessions: {settings.activeSessions}</h3>
        <p className="muted">Each login on a device or browser is one session. Signing out everywhere also ends this one.</p>
        <div className="admin-form-actions">
          <button type="button" className="btn btn-danger" onClick={signOutEverywhere}>Sign out everywhere</button>
        </div>
      </div>
    </>
  );
}
