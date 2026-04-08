require("dotenv").config();
const express = require("express");
const cors = require("cors");
const mongoose = require("mongoose");
const nodemailer = require("nodemailer");

const app = express();
app.use(cors());
app.use(express.json());

// ── MongoDB ──
mongoose
  .connect(process.env.MONGO_URI)
  .then(() => console.log("MongoDB connected"))
  .catch((err) => console.error("MongoDB error:", err));

const contactSchema = new mongoose.Schema(
  {
    name: { type: String, required: true, trim: true },
    email: { type: String, required: true, trim: true },
    message: { type: String, required: true, trim: true },
  },
  { timestamps: true }
);
const Contact = mongoose.model("Contact", contactSchema);

// ── Nodemailer transporter ──
const transporter = nodemailer.createTransport({
  service: "gmail",
  auth: {
    user: process.env.GMAIL_USER,
    pass: process.env.GMAIL_APP_PASSWORD, // Gmail App Password (not your real password)
  },
});

// ── POST /api/contact ──
app.post("/api/contact", async (req, res) => {
  const { name, email, message } = req.body;
  if (!name || !email || !message)
    return res.status(400).json({ error: "All fields are required." });

  try {
    // Save to MongoDB
    await Contact.create({ name, email, message });

    // Send email to Kamran's Gmail
    await transporter.sendMail({
      from: `"Portfolio Contact" <${process.env.GMAIL_USER}>`,
      to: process.env.GMAIL_USER,
      replyTo: email,
      subject: `📬 New message from ${name} — Portfolio`,
      html: `
        <div style="font-family:Inter,sans-serif;max-width:560px;margin:0 auto;background:#0f1117;color:#e2e8f0;border-radius:16px;overflow:hidden;">
          <div style="background:linear-gradient(135deg,#6366f1,#8b5cf6);padding:28px 32px;">
            <h2 style="margin:0;color:#fff;font-size:1.3rem;">New Portfolio Message</h2>
          </div>
          <div style="padding:28px 32px;">
            <p style="margin:0 0 8px;color:#94a3b8;font-size:0.85rem;">FROM</p>
            <p style="margin:0 0 20px;font-size:1rem;font-weight:600;">${name} &lt;${email}&gt;</p>
            <p style="margin:0 0 8px;color:#94a3b8;font-size:0.85rem;">MESSAGE</p>
            <p style="margin:0;background:#1e2330;padding:16px;border-radius:10px;line-height:1.7;font-size:0.95rem;">${message.replace(/\n/g, "<br/>")}</p>
            <p style="margin:24px 0 0;font-size:0.8rem;color:#64748b;">You can reply directly to this email to respond to ${name}.</p>
          </div>
        </div>
      `,
    });

    res.status(201).json({ success: true });
  } catch (err) {
    console.error("Mail error:", err.message);
    res.status(500).json({ error: "Failed to send message. Try again." });
  }
});

const PORT = process.env.PORT || 5000;
app.listen(PORT, () => console.log(`Server running on port ${PORT}`));
