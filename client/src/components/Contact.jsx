import { useState } from "react";
import api, { errorMessage } from "../api";
import Icon, { iconFor } from "./Icon";
import SectionHead from "./SectionHead";

const empty = { name: "", email: "", message: "" };

// wa.me needs digits only, with country code (10-digit numbers are assumed Indian).
const whatsappLink = (number, name = "") => {
  let digits = number.replace(/\D/g, "");
  if (digits.length === 10) digits = `91${digits}`;
  const text = encodeURIComponent(`Hi ${name.split(" ")[0] || "there"}, I came across your portfolio and would like to connect.`);
  return `https://wa.me/${digits}?text=${text}`;
};

export default function Contact({ profile }) {
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

  return (
    <section className="section section-alt" id="contact">
      <div className="container contact-grid">
        <div>
          <SectionHead index={6} label="contact" title="Let's talk" sub="Open to backend and full stack roles, freelance work, or a good conversation about APIs." />
          <div className="contact-lines">
            {profile.email && (
              <a className="contact-line" href={`mailto:${profile.email}`}><Icon name="mail" /> {profile.email}</a>
            )}
            {profile.phone && (
              <a className="contact-line" href={`tel:${profile.phone.replace(/\s/g, "")}`}><Icon name="phone" /> {profile.phone}</a>
            )}
            {profile.whatsapp && (
              <a className="contact-line contact-whatsapp" href={whatsappLink(profile.whatsapp, profile.name)} target="_blank" rel="noreferrer">
                <Icon name="whatsapp" /> WhatsApp: {profile.whatsapp}
              </a>
            )}
            {profile.location && (
              <div className="contact-line"><Icon name="pin" /> {profile.location}</div>
            )}
            {profile.socials?.slice(0, 2).map((s) => (
              <a key={s.label} className="contact-line" href={s.url} target="_blank" rel="noreferrer">
                <Icon name={iconFor(s.label)} /> {s.label}
              </a>
            ))}
          </div>
        </div>

        <form className="form" onSubmit={handleSubmit}>
          <div className="field">
            <label htmlFor="c-name">Name</label>
            <input id="c-name" name="name" value={form.name} onChange={handleChange} required maxLength={80} />
          </div>
          <div className="field">
            <label htmlFor="c-email">Email</label>
            <input id="c-email" name="email" type="email" value={form.email} onChange={handleChange} required />
          </div>
          <div className="field">
            <label htmlFor="c-msg">Message</label>
            <textarea id="c-msg" name="message" rows={5} value={form.message} onChange={handleChange} required minLength={5} maxLength={3000} />
          </div>
          <button type="submit" className="btn btn-primary btn-full" disabled={loading}>
            {loading ? "Sending…" : "Send message"}
          </button>
          {status && <p className={`form-msg ${status.ok ? "ok" : "err"}`}>{status.text}</p>}
        </form>
      </div>
    </section>
  );
}
