const jwt = require("jsonwebtoken");
const { ZodError } = require("zod");
const { Setting } = require("../models");
const logger = require("../utils/logger");

class HttpError extends Error {
  constructor(status, message) {
    super(message);
    this.status = status;
  }
}

// Wrap async handlers so rejected promises reach the error middleware.
const asyncHandler = (fn) => (req, res, next) => Promise.resolve(fn(req, res, next)).catch(next);

const validate = (schema) => (req, _res, next) => {
  try {
    req.body = schema.parse(req.body ?? {});
    next();
  } catch (err) {
    next(err);
  }
};

const requireAuth = asyncHandler(async (req, _res, next) => {
  const header = req.headers.authorization || "";
  const token = header.startsWith("Bearer ") ? header.slice(7) : null;
  if (!token) throw new HttpError(401, "Authentication required");
  try {
    req.user = jwt.verify(token, process.env.JWT_SECRET);
  } catch {
    throw new HttpError(401, "Invalid or expired token");
  }
  if (req.user.role !== "admin") throw new HttpError(401, "Invalid or expired token");

  // Tokens issued before the last password change are rejected.
  const setting = await Setting.findOne().select("tokenVersion").lean();
  if ((setting?.tokenVersion ?? 0) !== (req.user.tv ?? 0)) throw new HttpError(401, "Session expired, please log in again");
  next();
});

const notFound = (req, _res, next) => next(new HttpError(404, `Route not found: ${req.method} ${req.originalUrl}`));

// eslint-disable-next-line no-unused-vars
const errorHandler = (err, req, res, _next) => {
  if (err instanceof ZodError) {
    return res.status(400).json({
      error: "Validation failed",
      details: err.issues.map((i) => ({ field: i.path.join("."), message: i.message })),
    });
  }
  if (err.name === "CastError") return res.status(400).json({ error: "Invalid id" });

  const status = err.status || 500;
  if (status >= 500) logger.error(`${req.method} ${req.originalUrl} failed`, { error: err.message, stack: err.stack });
  res.status(status).json({ error: status >= 500 ? "Internal server error" : err.message });
};

module.exports = { HttpError, asyncHandler, validate, requireAuth, notFound, errorHandler };
