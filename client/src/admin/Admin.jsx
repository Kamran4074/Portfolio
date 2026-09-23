import { useCallback, useEffect, useState } from "react";
import api, { errorMessage, getToken, setToken } from "../api";
import { collections, profileConfig } from "./config";
import Form from "./Form";
import "./admin.css";

function Login({ onLogin }) {
  const [creds, setCreds] = useState({ email: "", password: "" });
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const submit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError("");
    try {
      const { data } = await api.post("/auth/login", creds);
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
        <p className="eyebrow">// admin</p>
        <h1 className="section-title" style={{ fontSize: "1.5rem", marginBottom: 20 }}>Sign in</h1>
        <div className="field">
          <label htmlFor="l-email">Email</label>
          <input id="l-email" type="email" autoComplete="username" value={creds.email} onChange={(e) => setCreds({ ...creds, email: e.target.value })} required />
        </div>
        <div className="field">
          <label htmlFor="l-pass">Password</label>
          <input id="l-pass" type="password" autoComplete="current-password" value={creds.password} onChange={(e) => setCreds({ ...creds, password: e.target.value })} required />
        </div>
        <button className="btn btn-primary btn-full" disabled={loading}>{loading ? "Signing in…" : "Sign in"}</button>
        {error && <p className="form-msg err">{error}</p>}
        <a href="/" className="more-link">← Back to site</a>
      </form>
    </div>
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

const tabs = [profileConfig, ...collections, { key: "inbox", label: "Inbox" }];

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
        <p className="nav-logo">~/<span>admin</span></p>
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
        {collections.some((c) => c.key === tab) && <CollectionEditor config={active} notify={notify} />}
      </main>
      {toast && <div className={`toast ${toast.error ? "err" : ""}`}>{toast.text}</div>}
    </div>
  );
}
