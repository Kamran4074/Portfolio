import { useState } from "react";
import api, { errorMessage } from "../api";
import Icon, { iconFor } from "./Icon";

const empty = { name: "", email: "", message: "" };

// wa.me needs digits only, with country code (10-digit numbers are assumed Indian).
const whatsappLink = (number, name = "") => {
  let digits = number.replace(/\D/g, "");
  if (digits.length === 10) digits = `91${digits}`;
  const text = encodeURIComponent(`Hi ${name.split(" ")[0] || "there"}, I came across your portfolio and would like to connect.`);
  return `https://wa.me/${digits}?text=${text}`;
};

export default function Contact({ index, profile }) {
  const [form, setForm] = useState(empty);
  const [status, setStatus] = useState(null); // { ok: boolean, text: string }
  const [loading, setLoading] = useState(false);

  const handleChange = (e) => setForm((prev) => ({ ...prev, [e.target.name]: e.target.value }));

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setStatus(null);
    try {
      await api.post("/contact", form);
      setStatus({ ok: true, text: "Message sent. I'll get back to you soon." });
      setForm(empty);
    } catch (err) {
      const text = err?.response?.status === 429 ? "Too many messages. Please try again later." : errorMessage(err);
      setStatus({ ok: false, text });
    } finally {
      setLoading(false);
    }
  };

  const profiles = (profile.socials || []).filter((s) => /github|linkedin/i.test(s.label));

  return (
    <section className="section section-alt contact" id="contact" aria-labelledby="contact-title">
      <div className="container">
        <div className="contact-cta">
          <p className="eyebrow" data-reveal>// {String(index).padStart(2, "0")}. contact</p>
          <h2 className="contact-title" id="contact-title" data-reveal>
            Let's build something <span className="accent">together.</span>
          </h2>
          <p className="section-sub" data-reveal>
            I'm open to backend and full stack roles, freelance work, or a good conversation about APIs and databases.
            I usually reply within a day.
          </p>
          <div className="cta-row" data-stagger>
            {profile.email && (
              <a href={`mailto:${profile.email}`} className="btn btn-primary btn-lg" data-magnetic>
                <Icon name="mail" /> Email me <span className="btn-arrow"><Icon name="arrow" size={15} /></span>
              </a>
            )}
            {profiles.map((s) => (
              <a key={s.label} href={s.url} className="btn btn-outline btn-lg" target="_blank" rel="noreferrer me">
                <Icon name={iconFor(s.label)} /> {s.label}
              </a>
            ))}
            {profile.resumeUrl && (
              <a href={profile.resumeUrl} className="btn btn-outline btn-lg" target="_blank" rel="noreferrer">
                <Icon name="file" /> Resume
              </a>
            )}
          </div>
        </div>

        <div className="contact-grid">
          <ul className="contact-lines" data-stagger>
            {profile.email && (
              <li><a className="contact-line" href={`mailto:${profile.email}`}><Icon name="mail" /> {profile.email}</a></li>
            )}
            {profile.phone && (
              <li><a className="contact-line" href={`tel:${profile.phone.replace(/\s/g, "")}`}><Icon name="phone" /> {profile.phone}</a></li>
            )}
            {profile.whatsapp && (
              <li>
                <a className="contact-line contact-whatsapp" href={whatsappLink(profile.whatsapp, profile.name)} target="_blank" rel="noreferrer">
                  <Icon name="whatsapp" /> WhatsApp: {profile.whatsapp}
                </a>
              </li>
            )}
            {profile.location && (
              <li><div className="contact-line"><Icon name="pin" /> {profile.location}</div></li>
            )}
          </ul>

          <form className="form" onSubmit={handleSubmit} data-reveal aria-labelledby="form-title">
            <h3 className="form-title" id="form-title">Send a message</h3>
            <div className="field">
              <label htmlFor="c-name">Name</label>
              <input id="c-name" name="name" autoComplete="name" value={form.name} onChange={handleChange} required maxLength={80} />
            </div>
            <div className="field">
              <label htmlFor="c-email">Email</label>
              <input id="c-email" name="email" type="email" autoComplete="email" value={form.email} onChange={handleChange} required />
            </div>
            <div className="field">
              <label htmlFor="c-msg">Message</label>
              <textarea id="c-msg" name="message" rows={5} value={form.message} onChange={handleChange} required minLength={5} maxLength={3000} />
            </div>
            <button type="submit" className="btn btn-primary btn-full" disabled={loading}>
              {loading ? "Sending…" : "Send message"} {!loading && <span className="btn-arrow"><Icon name="arrow" size={15} /></span>}
            </button>
            <p className={`form-msg ${status?.ok ? "ok" : "err"}`} role="status" aria-live="polite">{status?.text}</p>
          </form>
        </div>
      </div>
    </section>
  );
}
