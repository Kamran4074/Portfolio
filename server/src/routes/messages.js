const express = require("express");
const rateLimit = require("express-rate-limit");
const nodemailer = require("nodemailer");
const schemas = require("../validators/schemas");
const escapeHtml = require("../utils/escapeHtml");
const { Message } = require("../models");
const { asyncHandler, validate, requireAuth, HttpError } = require("../middleware");

const router = express.Router();

const transporter = nodemailer.createTransport({
  service: "gmail",
  auth: { user: process.env.GMAIL_USER, pass: process.env.GMAIL_APP_PASSWORD },
});

const contactLimiter = rateLimit({ windowMs: 60 * 60 * 1000, limit: 5, standardHeaders: true, legacyHeaders: false });

// Public: contact form.
router.post(
  "/contact",
  contactLimiter,
  validate(schemas.message),
  asyncHandler(async (req, res) => {
    const { name, email, message } = req.body;
    await Message.create({ name, email, message });

    // The message is already stored, so a mail failure should not fail the request.
    const safe = { name: escapeHtml(name), email: escapeHtml(email), message: escapeHtml(message).replace(/\n/g, "<br/>") };
    transporter
      .sendMail({
        from: `"Portfolio Contact" <${process.env.GMAIL_USER}>`,
        to: process.env.GMAIL_USER,
        replyTo: email,
        subject: `New message from ${name.replace(/[\r\n]/g, " ")} (Portfolio)`,
        html: `
          <div style="font-family:Inter,Arial,sans-serif;max-width:560px;margin:0 auto;background:#0b1016;color:#e6edf3;border-radius:14px;overflow:hidden;">
            <div style="background:#2dd4bf;padding:22px 28px;"><h2 style="margin:0;color:#04221e;font-size:1.15rem;">New Portfolio Message</h2></div>
            <div style="padding:24px 28px;">
              <p style="margin:0 0 6px;color:#8b98a8;font-size:0.8rem;">FROM</p>
              <p style="margin:0 0 18px;font-weight:600;">${safe.name} &lt;${safe.email}&gt;</p>
              <p style="margin:0 0 6px;color:#8b98a8;font-size:0.8rem;">MESSAGE</p>
              <p style="margin:0;background:#141c26;padding:14px;border-radius:10px;line-height:1.7;">${safe.message}</p>
            </div>
          </div>`,
      })
      .catch((err) => console.error("Mail error:", err.message));

    res.status(201).json({ success: true });
  })
);

// Admin: inbox.
router.get(
  "/messages",
  requireAuth,
  asyncHandler(async (_req, res) => res.json(await Message.find().sort({ createdAt: -1 }).limit(200).lean()))
);

router.patch(
  "/messages/:id/read",
  requireAuth,
  asyncHandler(async (req, res) => {
    const doc = await Message.findByIdAndUpdate(req.params.id, { read: true }, { new: true });
    if (!doc) throw new HttpError(404, "Not found");
    res.json(doc);
  })
);

router.delete(
  "/messages/:id",
  requireAuth,
  asyncHandler(async (req, res) => {
    const doc = await Message.findByIdAndDelete(req.params.id);
    if (!doc) throw new HttpError(404, "Not found");
    res.status(204).end();
  })
);

module.exports = router;
