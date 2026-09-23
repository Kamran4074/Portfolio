import { useCallback, useEffect, useState } from "react";
import api, { errorMessage, getToken, setToken } from "../api";
import { collections, profileConfig } from "./config";
import Form from "./Form";
import "./admin.css";

function Login({ onLogin }) {
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const submit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError("");
    try {
      const { data } = await api.post("/auth/login", { password });
      setToken(data.token);
      onLogin();
    } catch (err) {
      setError(err?.response?.status === 429 ? "Too many attempts. Try again in 15 minutes." : errorMessage(err));
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="admin-login">
      <form className="form" onSubmit={submit}>
        <p className="eyebrow">// settings</p>
        <h1 className="section-title" style={{ fontSize: "1.5rem", marginBottom: 20 }}>Enter password</h1>
        <div className="field">
          <label htmlFor="l-pass">Password</label>
          <input id="l-pass" type="password" autoComplete="current-password" autoFocus value={password} onChange={(e) => setPassword(e.target.value)} required />
        </div>
        <button className="btn btn-primary btn-full" disabled={loading}>{loading ? "Checking…" : "Unlock settings"}</button>
        {error && <p className="form-msg err">{error}</p>}
        <a href="/" className="more-link">← Back to site</a>
      </form>
    </div>
  );
}

function PasswordEditor({ notify }) {
  const blank = { currentPassword: "", newPassword: "", confirm: "" };
  const [values, setValues] = useState(blank);
  const [saving, setSaving] = useState(false);
  const set = (name) => (e) => setValues((v) => ({ ...v, [name]: e.target.value }));

  const submit = async (e) => {
    e.preventDefault();
    if (values.newPassword !== values.confirm) return notify("New passwords do not match", true);
    setSaving(true);
    try {
      const { data } = await api.put("/auth/password", { currentPassword: values.currentPassword, newPassword: values.newPassword });
      setToken(data.token);
      setValues(blank);
      notify("Password changed. Other sessions were logged out.");
    } catch (err) {
      notify(err?.response?.status === 429 ? "Too many attempts. Try again in 15 minutes." : errorMessage(err), true);
    } finally {
      setSaving(false);
    }
  };

  return (
    <form className="admin-form" onSubmit={submit}>
      <div className="field">
        <label htmlFor="p-current">Current password</label>
        <input id="p-current" type="password" autoComplete="current-password" value={values.currentPassword} onChange={set("currentPassword")} required />
      </div>
      <div className="field">
        <label htmlFor="p-new">New password</label>
        <input id="p-new" type="password" autoComplete="new-password" minLength={10} value={values.newPassword} onChange={set("newPassword")} required />
        <small className="hint">At least 10 characters.</small>
      </div>
      <div className="field">
        <label htmlFor="p-confirm">Confirm new password</label>
        <input id="p-confirm" type="password" autoComplete="new-password" minLength={10} value={values.confirm} onChange={set("confirm")} required />
      </div>
      <div className="admin-form-actions">
        <button type="submit" className="btn btn-primary" disabled={saving}>{saving ? "Saving…" : "Change password"}</button>
      </div>
    </form>
  );
}

function ProfileEditor({ notify }) {
  const [doc, setDoc] = useState(null);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    api.get("/profile").then(({ data }) => setDoc(data || {})).catch((e) => notify(errorMessage(e), true));
  }, [notify]);

  const save = async (body) => {
    setSaving(true);
    try {
      const { data } = await api.put("/profile", body);
      setDoc(data);
      notify("Profile saved");
    } catch (e) {
      notify(errorMessage(e), true);
    } finally {
      setSaving(false);
    }
  };

  if (!doc) return <p className="muted">Loading…</p>;
  return <Form key={doc.updatedAt || "new"} fields={profileConfig.fields} doc={doc} onSave={save} saving={saving} />;
}

function CollectionEditor({ config, notify }) {
  const [items, setItems] = useState([]);
  const [editing, setEditing] = useState(null); // null | "new" | document
  const [saving, setSaving] = useState(false);

  const load = useCallback(() => {
    api.get(config.endpoint).then(({ data }) => setItems(data)).catch((e) => notify(errorMessage(e), true));
  }, [config.endpoint, notify]);

  useEffect(() => {
    setEditing(null);
    load();
  }, [load]);

  const save = async (body) => {
    setSaving(true);
    try {
      if (editing === "new") await api.post(config.endpoint, body);
      else await api.put(`${config.endpoint}/${editing._id}`, body);
      notify("Saved");
      setEditing(null);
      load();
    } catch (e) {
      notify(errorMessage(e), true);
    } finally {
      setSaving(false);
    }
  };

  const remove = async (doc) => {
    if (!window.confirm(`Delete "${config.title(doc)}"?`)) return;
    try {
      await api.delete(`${config.endpoint}/${doc._id}`);
      notify("Deleted");
      load();
    } catch (e) {
      notify(errorMessage(e), true);
    }
  };

  const nextOrder = items.reduce((m, d) => Math.max(m, d.order ?? 0), -1) + 1;

  return (
    <>
      {editing ? (
        <div className="admin-card">
          <h3>{editing === "new" ? `New ${config.label.toLowerCase()} entry` : "Edit"}</h3>
          <Form
            key={editing === "new" ? "new" : editing._id}
            fields={config.fields}
            doc={editing === "new" ? { order: nextOrder } : editing}
            onSave={save}
            onCancel={() => setEditing(null)}
            saving={saving}
          />
        </div>
      ) : (
        <button className="btn btn-primary" onClick={() => setEditing("new")}>+ Add {config.label.toLowerCase()}</button>
      )}

      <ul className="admin-list">
        {items.map((doc) => (
          <li key={doc._id}>
            <span className="order mono">{doc.order}</span>
            <div className="admin-list-text">
              <strong>{config.title(doc)}</strong>
              {config.subtitle(doc) && <small>{config.subtitle(doc)}</small>}
            </div>
            <button className="btn btn-outline btn-sm" onClick={() => setEditing(doc)}>Edit</button>
            <button className="btn btn-danger btn-sm" onClick={() => remove(doc)}>Delete</button>
          </li>
        ))}
        {items.length === 0 && <li className="muted">Nothing here yet.</li>}
      </ul>
    </>
  );
}

function Inbox({ notify }) {
  const [messages, setMessages] = useState([]);

  const load = useCallback(() => {
    api.get("/messages").then(({ data }) => setMessages(data)).catch((e) => notify(errorMessage(e), true));
  }, [notify]);
  useEffect(load, [load]);

  const markRead = (m) => api.patch(`/messages/${m._id}/read`).then(load);
  const remove = (m) => window.confirm("Delete this message?") && api.delete(`/messages/${m._id}`).then(load);

  return (
    <ul className="admin-list inbox">
      {messages.map((m) => (
        <li key={m._id} className={m.read ? "" : "unread"}>
          <div className="admin-list-text">
            <strong>{m.name} <a href={`mailto:${m.email}`}>&lt;{m.email}&gt;</a></strong>
            <small>{new Date(m.createdAt).toLocaleString()}</small>
            <p>{m.message}</p>
          </div>
          {!m.read && <button className="btn btn-outline btn-sm" onClick={() => markRead(m)}>Mark read</button>}
          <button className="btn btn-danger btn-sm" onClick={() => remove(m)}>Delete</button>
        </li>
      ))}
      {messages.length === 0 && <li className="muted">No messages yet.</li>}
    </ul>
  );
}

const tabs = [profileConfig, ...collections, { key: "inbox", label: "Inbox" }, { key: "password", label: "Password" }];

export default function Admin() {
  const [authed, setAuthed] = useState(null); // null = checking
  const [tab, setTab] = useState("profile");
  const [toast, setToast] = useState(null);

  const logout = useCallback(() => {
    setToken(null);
    setAuthed(false);
  }, []);

  const notify = useCallback((text, error = false) => {
    setToast({ text, error });
    setTimeout(() => setToast(null), error ? 6000 : 2500);
  }, []);

  // Keep this page out of search engines.
  useEffect(() => {
    const meta = document.createElement("meta");
    meta.name = "robots";
    meta.content = "noindex, nofollow";
    document.head.appendChild(meta);
    document.title = "Settings";
    return () => meta.remove();
  }, []);

  useEffect(() => {
    if (!getToken()) return setAuthed(false);
    api.get("/auth/me").then(() => setAuthed(true)).catch(logout);
  }, [logout]);

  // Any 401 (expired token) drops back to the login screen.
  useEffect(() => {
    const id = api.interceptors.response.use(undefined, (err) => {
      if (err?.response?.status === 401 && getToken()) logout();
      return Promise.reject(err);
    });
    return () => api.interceptors.response.eject(id);
  }, [logout]);

  if (authed === null) return <p className="muted" style={{ padding: 40 }}>Checking session…</p>;
  if (!authed) return <Login onLogin={() => setAuthed(true)} />;

  const active = tabs.find((t) => t.key === tab);

  return (
    <div className="admin">
      <aside className="admin-side">
        <p className="nav-logo">~/<span>settings</span></p>
        <nav>
          {tabs.map((t) => (
            <button key={t.key} className={t.key === tab ? "active" : ""} onClick={() => setTab(t.key)}>{t.label}</button>
          ))}
        </nav>
        <div className="admin-side-foot">
          <a href="/" target="_blank" rel="noreferrer" className="btn btn-outline btn-sm">View site</a>
          <button className="btn btn-outline btn-sm" onClick={logout}>Log out</button>
        </div>
      </aside>
      <main className="admin-main">
        <h2 className="section-title" style={{ fontSize: "1.5rem", marginBottom: 20 }}>{active.label}</h2>
        {tab === "profile" && <ProfileEditor notify={notify} />}
        {tab === "inbox" && <Inbox notify={notify} />}
        {tab === "password" && <PasswordEditor notify={notify} />}
        {collections.some((c) => c.key === tab) && <CollectionEditor config={active} notify={notify} />}
      </main>
      {toast && <div className={`toast ${toast.error ? "err" : ""}`}>{toast.text}</div>}
    </div>
  );
}
