// Email notification for new contact messages (Gmail via nodemailer). Optional:
// without GMAIL_USER/GMAIL_APP_PASSWORD messages are still saved, just not emailed.
const nodemailer = require("nodemailer");
const escapeHtml = require("../../utils/escapeHtml");
const env = require("../../config/env");

const transporter = env.mailEnabled
  ? nodemailer.createTransport({ service: "gmail", auth: { user: env.GMAIL_USER, pass: env.GMAIL_APP_PASSWORD } })
  : null;

// Every user-supplied value is escaped before it goes into the HTML.
function contactMail({ name, email, message }) {
  const safe = { name: escapeHtml(name), email: escapeHtml(email), message: escapeHtml(message).replace(/\n/g, "<br/>") };
  return {
    from: `"Portfolio Contact" <${env.GMAIL_USER}>`,
    to: env.CONTACT_TO || env.GMAIL_USER,
    replyTo: email,
    // No line breaks in a header: they could inject extra headers.
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
  };
}

module.exports = {
  enabled: () => Boolean(transporter),
  sendContactMail: (contact) => transporter.sendMail(contactMail(contact)),
  contactMail,
};
