const HttpError = require("../../core/HttpError");
const repo = require("./messages.repository");
const mailer = require("./mailer");
const logger = require("../../utils/logger");

// Saves the message, then emails it. The message is already stored, so a mail failure
// is logged and does not fail the request. Awaited because serverless hosts (Vercel)
// freeze the function after responding.
// Logged by id, not by sender details: the inbox in /settings has those.
async function submit({ website, ...contact }, { reqId } = {}) {
  // A filled honeypot is a bot: answer as if it worked (so it learns nothing), store nothing.
  if (website) {
    logger.warn("Contact message dropped: honeypot filled", { reqId });
    return { saved: null, mailed: false, spam: true };
  }
  const saved = await repo.create(contact);
  logger.info("Contact message received", { reqId, messageId: saved.id, length: contact.message.length });

  if (!mailer.enabled()) {
    logger.warn("Contact mail skipped: Gmail is not configured", { messageId: saved.id });
    return { saved, mailed: false };
  }
  const started = Date.now();
  try {
    await mailer.sendContactMail(contact);
    logger.info("Contact mail sent", { reqId, messageId: saved.id, ms: Date.now() - started });
    return { saved, mailed: true };
  } catch (err) {
    logger.error("Contact mail failed", { reqId, messageId: saved.id, error: err.message, code: err.code });
    return { saved, mailed: false };
  }
}

const found = (doc) => {
  if (!doc) throw new HttpError(404, "Not found");
  return doc;
};

module.exports = {
  submit,
  inbox: () => repo.listLatest(),
  markRead: async (id) => found(await repo.markRead(id)),
  remove: async (id) => found(await repo.remove(id)),
};
