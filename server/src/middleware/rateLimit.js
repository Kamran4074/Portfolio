// Rate limiting (express-rate-limit, per IP). Every block is logged, so brute force,
// spam and scraping show up in the log.
// Security-relevant limits count in MongoDB, so they hold across every serverless
// instance; the high-volume API/image limits count in memory per instance.
const rateLimit = require("express-rate-limit");
const MongoRateLimitStore = require("./mongoRateLimitStore");
const logger = require("../utils/logger");
const { reqMeta } = require("../core/requestContext");

const MIN = 60 * 1000;

const createLimiter = (name, { windowMs, limit, message = "Too many requests, please try again later.", skip, shared = false }) =>
  rateLimit({
    windowMs,
    limit,
    skip,
    standardHeaders: true,
    legacyHeaders: false,
    ...(shared && { store: new MongoRateLimitStore(name) }),
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
  login: createLimiter("login", { windowMs: 15 * MIN, limit: 5, message: "Too many attempts. Try again in 15 minutes.", shared: true }),
  // One refresh per access-token lifetime is normal; this only stops token-guessing loops.
  refresh: createLimiter("refresh", { windowMs: 15 * MIN, limit: 30, message: "Too many session refreshes. Try again later.", shared: true }),
  contact: createLimiter("contact", { windowMs: 60 * MIN, limit: 5, message: "Too many messages. Please try again later.", shared: true }),
  upload: createLimiter("upload", { windowMs: 60 * MIN, limit: 60, message: "Too many uploads. Try again later.", shared: true }),
  keepAlive: createLimiter("keep-alive", { windowMs: 60 * MIN, limit: 10, shared: true }),
};
