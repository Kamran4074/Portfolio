const jwt = require("jsonwebtoken");
const { ZodError } = require("zod");

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

const requireAuth = (req, _res, next) => {
  const header = req.headers.authorization || "";
  const token = header.startsWith("Bearer ") ? header.slice(7) : null;
  if (!token) return next(new HttpError(401, "Authentication required"));
  try {
    req.user = jwt.verify(token, process.env.JWT_SECRET);
    if (req.user.role !== "admin") throw new Error("forbidden");
    next();
  } catch {
    next(new HttpError(401, "Invalid or expired token"));
  }
};

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
  if (status >= 500) console.error(`[${req.method} ${req.originalUrl}]`, err);
  res.status(status).json({ error: status >= 500 ? "Internal server error" : err.message });
};

module.exports = { HttpError, asyncHandler, validate, requireAuth, notFound, errorHandler };
