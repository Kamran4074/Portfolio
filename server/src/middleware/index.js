const jwt = require("jsonwebtoken");
const rateLimit = require("express-rate-limit");
const { ZodError } = require("zod");
const { Setting } = require("../models");
const logger = require("../utils/logger");
const env = require("../config/env");

class HttpError extends Error {
  constructor(status, message) {
    super(message);
    this.status = status;
  }
}

// Context attached to every log line about a request, so lines can be tied together.
const reqMeta = (req) => ({ reqId: req.id, method: req.method, url: req.originalUrl, ip: req.ip });

// Audit trail for changes made from /settings: who-ish (ip), what, which document.
const audit = (req, action, meta = {}) => logger.info(`audit: ${action}`, { ...reqMeta(req), ...meta });

// Wrap async handlers so rejected promises reach the error middleware.
const asyncHandler = (fn) => (req, res, next) => Promise.resolve(fn(req, res, next)).catch(next);

// Zod validation for any part of the request: validate(schema) checks the body,
// validate(schema, "params") / validate(schema, "query") check the URL.
// The parsed (trimmed, defaulted, coerced) result replaces the original.
const validate = (schema, source = "body") => (req, _res, next) => {
  try {
    req[source] = schema.parse(req[source] ?? {});
    next();
  } catch (err) {
    if (err instanceof ZodError) err.source = source;
    next(err);
  }
};

// express-rate-limit with a log line when someone is blocked (brute force, spam, abuse).
const limiter = (name, { windowMs, limit, message = "Too many requests, please try again later." }) =>
  rateLimit({
    windowMs,
    limit,
    standardHeaders: true,
    legacyHeaders: false,
    handler: (req, res) => {
      logger.warn(`Rate limit hit: ${name}`, { ...reqMeta(req), limit, windowMin: windowMs / 60000 });
      res.status(429).json({ error: message });
    },
  });

const requireAuth = asyncHandler(async (req, _res, next) => {
  const deny = (reason, message = "Invalid or expired token") => {
    logger.warn(`Auth rejected: ${reason}`, reqMeta(req));
    throw new HttpError(401, message);
  };

  const header = req.headers.authorization || "";
  const token = header.startsWith("Bearer ") ? header.slice(7) : null;
  if (!token) {
    logger.debug("Auth rejected: no token", reqMeta(req));
    throw new HttpError(401, "Authentication required");
  }
  try {
    req.user = jwt.verify(token, env.JWT_SECRET);
  } catch (err) {
    deny(err.name === "TokenExpiredError" ? "token expired" : "invalid token");
  }
  if (req.user.role !== "admin") deny("wrong role");

  // Tokens issued before the last password change are rejected.
  const setting = await Setting.findOne().select("tokenVersion").lean();
  if ((setting?.tokenVersion ?? 0) !== (req.user.tv ?? 0)) deny("token from before a password change", "Session expired, please log in again");
  next();
});

const notFound = (req, _res, next) => next(new HttpError(404, `Route not found: ${req.method} ${req.originalUrl}`));

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
    return res.status(status).json({ error: "Internal server error", requestId: req.id });
  }
  res.status(status).json({ error: err.message });
};

module.exports = { HttpError, reqMeta, audit, asyncHandler, validate, limiter, requireAuth, notFound, errorHandler };
