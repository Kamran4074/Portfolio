//   POST /api/auth/login        public ({ password }) -> { accessToken } + refresh cookie
//   POST /api/auth/refresh      refresh cookie -> new access token + rotated cookie
//   POST /api/auth/logout       ends this login (refresh-token family), clears the cookie
//   POST /api/auth/logout-all   admin; signs out every session
//   GET  /api/auth/me           admin
//   PUT  /api/auth/password     admin ({ currentPassword, newPassword })
//   GET  /api/auth/settings     admin; session lifetimes + active session count
//   PUT  /api/auth/settings     admin ({ accessTokenMinutes, refreshTokenDays })
const express = require("express");
const HttpError = require("../../core/HttpError");
const { validate, requireAuth, rateLimit } = require("../../middleware");
const schemas = require("./auth.schema");
const controller = require("./auth.controller");

const router = express.Router();

// CSRF guard for the cookie-authenticated endpoints. A custom header cannot be sent
// cross-site without a CORS preflight, which only the configured site origin passes.
const requireXhr = (req, _res, next) =>
  next(req.get("x-requested-with") === "XMLHttpRequest" ? undefined : new HttpError(403, "Missing X-Requested-With header"));

router.post("/login", rateLimit.login, validate(schemas.login), controller.login);
router.post("/refresh", rateLimit.refresh, requireXhr, controller.refresh);
router.post("/logout", requireXhr, controller.logout);
router.post("/logout-all", requireAuth, controller.logoutAll);
router.get("/me", requireAuth, controller.me);
router.put("/password", rateLimit.login, requireAuth, validate(schemas.changePassword), controller.changePassword);
router.get("/settings", requireAuth, controller.getSessionSettings);
router.put("/settings", requireAuth, validate(schemas.sessionSettings), controller.updateSessionSettings);

module.exports = router;
