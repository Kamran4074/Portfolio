const asyncHandler = require("../../core/asyncHandler");
const HttpError = require("../../core/HttpError");
const { audit, reqMeta } = require("../../core/requestContext");
const authService = require("./auth.service");
const logger = require("../../utils/logger");

// Logs failed attempts (with the reason) before passing the error on.
const logFailure = (req, label) => (err) => {
  if (err instanceof HttpError && err.reason) {
    const level = err.status >= 500 ? "error" : "warn";
    logger.log(level, `${label} failed: ${err.reason}`, reqMeta(req));
  }
  throw err;
};

const login = asyncHandler(async (req, res) => {
  const token = await authService.login(req.body.password).catch(logFailure(req, "Login"));
  audit(req, "Login succeeded");
  res.json({ token });
});

const me = (req, res) => res.json({ role: req.user.role });

const changePassword = asyncHandler(async (req, res) => {
  const { token, tokenVersion } = await authService
    .changePassword(req.body.currentPassword, req.body.newPassword)
    .catch(logFailure(req, "Password change"));
  audit(req, "Password changed; other sessions signed out", { tokenVersion });
  res.json({ token });
});

module.exports = { login, me, changePassword };
