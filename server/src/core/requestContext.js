const logger = require("../utils/logger");

// Context attached to every log line about a request, so lines can be tied together.
const reqMeta = (req) => ({ reqId: req.id, method: req.method, url: req.originalUrl, ip: req.ip });

// Audit trail for changes made from /settings: who-ish (ip), what, which document.
const audit = (req, action, meta = {}) => logger.info(`audit: ${action}`, { ...reqMeta(req), ...meta });

module.exports = { reqMeta, audit };
