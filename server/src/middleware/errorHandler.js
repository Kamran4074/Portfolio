const { ZodError } = require("zod");
const HttpError = require("../core/HttpError");
const { reqMeta } = require("../core/requestContext");
const logger = require("../utils/logger");

const notFound = (req, _res, next) => next(new HttpError(404, `Route not found: ${req.method} ${req.originalUrl}`));

// One place that turns any error into a JSON response and logs it at the right level.
// 4xx are already in the access log (morgan, level warn); 5xx are logged here with the stack.
// eslint-disable-next-line no-unused-vars
const errorHandler = (err, req, res, _next) => {
  if (err instanceof ZodError) {
    const details = err.issues.map((i) => ({ field: i.path.join("."), message: i.message }));
    // Field names and rules only: request values can contain personal data or passwords.
    logger.warn("Validation failed", { ...reqMeta(req), source: err.source || "body", fields: details.map((d) => d.field) });
    return res.status(400).json({ error: "Validation failed", details });
  }
  if (err.name === "CastError") return res.status(400).json({ error: "Invalid id" });
  if (err.type === "entity.parse.failed") return res.status(400).json({ error: "Malformed JSON body" });
  if (err.type === "entity.too.large") return res.status(413).json({ error: "Request body too large" });

  const status = err.status || 500;
  if (status >= 500) {
    logger.error(`${req.method} ${req.originalUrl} failed: ${err.message}`, { ...reqMeta(req), stack: err.stack });
    // The id lets a visitor's bug report be matched to this exact log line.
    return res.status(status).json({ error: status === 500 ? "Internal server error" : err.message, requestId: req.id });
  }
  res.status(status).json(err instanceof HttpError && err.code ? { error: err.message, code: err.code } : { error: err.message });
};

module.exports = { notFound, errorHandler };
