const express = require("express");
const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");
const schemas = require("../validators/schemas");
const { Setting } = require("../models");
const { asyncHandler, validate, limiter, requireAuth, audit, reqMeta, HttpError } = require("../middleware");
const logger = require("../utils/logger");
const env = require("../config/env");

const router = express.Router();

// Brute-force protection: 5 attempts per 15 minutes per IP (blocked attempts are logged).
const loginLimiter = limiter("login", {
  windowMs: 15 * 60 * 1000,
  limit: 5,
  message: "Too many attempts. Try again in 15 minutes.",
});

const signToken = (tokenVersion) =>
  jwt.sign({ sub: "admin", role: "admin", tv: tokenVersion }, env.JWT_SECRET, { expiresIn: "2h" });

// The password lives in MongoDB (set with `npm run seed-password`).
// ADMIN_PASSWORD_HASH in .env is only a fallback until it has been seeded.
async function currentHash() {
  const setting = await Setting.findOne().lean();
  return { hash: setting?.passwordHash || env.ADMIN_PASSWORD_HASH, tokenVersion: setting?.tokenVersion ?? 0 };
}

router.post(
  "/login",
  loginLimiter,
  validate(schemas.login),
  asyncHandler(async (req, res) => {
    if (!env.JWT_SECRET) throw new HttpError(503, "Settings login is not configured (JWT_SECRET missing)");
    const { hash, tokenVersion } = await currentHash();
    if (!hash) {
      logger.error("Login attempted but no password is set", reqMeta(req));
      throw new HttpError(503, "No password set. Run: npm run seed-password -- \"your-password\"");
    }

    if (!(await bcrypt.compare(req.body.password, hash))) {
      // Security signal: repeated lines from one IP mean someone is guessing.
      logger.warn("Login failed: wrong password", reqMeta(req));
      throw new HttpError(401, "Wrong password");
    }
    audit(req, "Login succeeded");
    res.json({ token: signToken(tokenVersion) });
  })
);

router.get("/me", requireAuth, (req, res) => res.json({ role: req.user.role }));

router.put(
  "/password",
  loginLimiter,
  requireAuth,
  validate(schemas.changePassword),
  asyncHandler(async (req, res) => {
    const { hash, tokenVersion } = await currentHash();
    if (!(await bcrypt.compare(req.body.currentPassword, hash))) {
      logger.warn("Password change failed: current password wrong", reqMeta(req));
      throw new HttpError(400, "Current password is wrong");
    }

    const next = tokenVersion + 1;
    await Setting.findOneAndUpdate(
      {},
      { passwordHash: await bcrypt.hash(req.body.newPassword, 12), tokenVersion: next },
      { upsert: true }
    );
    audit(req, "Password changed; other sessions signed out", { tokenVersion: next });
    // Other sessions are logged out; this one gets a fresh token.
    res.json({ token: signToken(next) });
  })
);

module.exports = router;
