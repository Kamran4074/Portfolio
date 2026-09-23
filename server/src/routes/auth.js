const express = require("express");
const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");
const rateLimit = require("express-rate-limit");
const schemas = require("../validators/schemas");
const { asyncHandler, validate, requireAuth, HttpError } = require("../middleware");

const router = express.Router();

// Brute-force protection: 5 attempts per 15 minutes per IP.
const loginLimiter = rateLimit({ windowMs: 15 * 60 * 1000, limit: 5, standardHeaders: true, legacyHeaders: false });

router.post(
  "/login",
  loginLimiter,
  validate(schemas.login),
  asyncHandler(async (req, res) => {
    const { email, password } = req.body;
    const { ADMIN_EMAIL, ADMIN_PASSWORD_HASH, JWT_SECRET } = process.env;
    if (!ADMIN_EMAIL || !ADMIN_PASSWORD_HASH || !JWT_SECRET) throw new HttpError(503, "Admin login is not configured");

    // Always run bcrypt so response time does not reveal whether the email matched.
    const passwordOk = await bcrypt.compare(password, ADMIN_PASSWORD_HASH);
    if (email.toLowerCase() !== ADMIN_EMAIL.toLowerCase() || !passwordOk) {
      throw new HttpError(401, "Invalid credentials");
    }

    const token = jwt.sign({ sub: email, role: "admin" }, JWT_SECRET, { expiresIn: "2h" });
    res.json({ token });
  })
);

router.get("/me", requireAuth, (req, res) => res.json({ email: req.user.sub, role: req.user.role }));

module.exports = router;
