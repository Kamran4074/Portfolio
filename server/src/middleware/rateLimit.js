// Rate limiting (express-rate-limit, per IP). Every block is logged, so brute force,
// spam and scraping show up in the log. Counters live in memory: on Vercel each warm
// instance counts separately, which is fine for a portfolio (use a shared store to scale).
const rateLimit = require("express-rate-limit");
const logger = require("../utils/logger");
const { reqMeta } = require("../core/requestContext");

const MIN = 60 * 1000;

const createLimiter = (name, { windowMs, limit, message = "Too many requests, please try again later.", skip }) =>
  rateLimit({
    windowMs,
    limit,
    skip,
    standardHeaders: true,
    legacyHeaders: false,
    handler: (req, res) => {
      logger.warn(`Rate limit hit: ${name}`, { ...reqMeta(req), limit, windowMin: windowMs / MIN });
      res.status(429).json({ error: message });
    },
  });

const isImageGet = (req) => req.method === "GET" && /^\/(screenshots\/|profile\/photo)/.test(req.path);

module.exports = {
  createLimiter,
  // Whole API. Images are skipped here and limited separately: one page view loads several.
  // Generous because many visitors can share one IP (college or office networks).
  api: createLimiter("api", { windowMs: 15 * MIN, limit: 500, skip: (req) => isImageGet(req) || req.path === "/health" }),
  media: createLimiter("media", { windowMs: 15 * MIN, limit: 2000 }),
  // Brute-force protection for the settings password.
  login: createLimiter("login", { windowMs: 15 * MIN, limit: 5, message: "Too many attempts. Try again in 15 minutes." }),
  contact: createLimiter("contact form", { windowMs: 60 * MIN, limit: 5, message: "Too many messages. Please try again later." }),
  upload: createLimiter("upload", { windowMs: 60 * MIN, limit: 60, message: "Too many uploads. Try again later." }),
  keepAlive: createLimiter("keep-alive", { windowMs: 60 * MIN, limit: 10 }),
};
