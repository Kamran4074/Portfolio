import { useState } from "react";
import axios from "axios";

const contactLinks = [
  { icon: "✉️", label: "kamran.alam.work@gmail.com", href: "mailto:kamran.alam.work@gmail.com" },
  { icon: "📞", label: "+91 7301730616", href: "tel:+917301730616" },
  { icon: "💼", label: "LinkedIn", href: "https://www.linkedin.com/in/kamran-alam-73017kam/" },
  { icon: "🐙", label: "GitHub", href: "https://github.com/Kamran4074" },
];

export default function Contact() {
  const [form, setForm] = useState({ name: "", email: "", message: "" });
  const [status, setStatus] = useState(null); // "success" | "error" | null
  const [loading, setLoading] = useState(false);

  const handleChange = (e) =>
    setForm((prev) => ({ ...prev, [e.target.name]: e.target.value }));

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setStatus(null);
    try {
      await axios.post("/api/contact", form);
      setStatus("success");
      setForm({ name: "", email: "", message: "" });
    } catch {
      setStatus("error");
    } finally {
      setLoading(false);
    }
  };

  return (
    <section className="section" id="contact">
      <div className="container">
        <h2 className="section-title">Get In Touch</h2>
        <p className="contact-sub">Open to opportunities, collaborations, or just a good tech chat.</p>

        <div className="contact-cards">
          {contactLinks.map((c) => (
            <a key={c.label} href={c.href} target="_blank" rel="noreferrer" className="contact-card">
              <span>{c.icon}</span>
              <p>{c.label}</p>
            </a>
          ))}
        </div>

        <form className="contact-form" onSubmit={handleSubmit}>
          <h3>Send a Message</h3>
          <div className="form-group">
            <label>Name</label>
            <input
              name="name" type="text" placeholder="Your name"
              value={form.name} onChange={handleChange} required
            />
          </div>
          <div className="form-group">
            <label>Email</label>
            <input
              name="email" type="email" placeholder="your@email.com"
              value={form.email} onChange={handleChange} required
            />
          </div>
          <div className="form-group">
            <label>Message</label>
            <textarea
              name="message" rows={5} placeholder="What's on your mind?"
              value={form.message} onChange={handleChange} required
            />
          </div>
          <button type="submit" className="btn btn-primary btn-full" disabled={loading}>
            {loading ? "Sending..." : "Send Message →"}
          </button>
          {status === "success" && <p className="form-success">Message sent successfully! 🎉</p>}
          {status === "error" && <p className="form-error">Something went wrong. Try again.</p>}
        </form>
      </div>
    </section>
  );
}
