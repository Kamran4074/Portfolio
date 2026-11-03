const asyncHandler = require("../../core/asyncHandler");
const HttpError = require("../../core/HttpError");
const { audit, reqMeta } = require("../../core/requestContext");
const authService = require("./auth.service");
const cookies = require("./auth.cookies");
const logger = require("../../utils/logger");

const ctx = (req) => ({ ip: req.ip, userAgent: req.get("user-agent") });

// Logs failed attempts (with the reason) before passing the error on.
const logFailure = (req, label) => (err) => {
  if (err instanceof HttpError && err.reason) {
    const level = err.status >= 500 ? "error" : "warn";
    logger.log(level, `${label} failed: ${err.reason}`, reqMeta(req));
  }
  throw err;
};

// Refresh token goes into the HttpOnly cookie; only the access token is in the body.
// `token` repeats the access token for clients built before access/refresh tokens.
const sendTokens = (res, { accessToken, expiresIn, refreshToken, refreshExpiresAt }) => {
  cookies.set(res, refreshToken, refreshExpiresAt);
  res.json({ accessToken, expiresIn, token: accessToken });
};

const login = asyncHandler(async (req, res) => {
  const tokens = await authService.login(req.body.password, ctx(req)).catch(logFailure(req, "Login"));
  audit(req, "Login succeeded");
  sendTokens(res, tokens);
});

const refresh = asyncHandler(async (req, res) => {
  try {
    sendTokens(res, await authService.refresh(cookies.read(req), ctx(req)));
  } catch (err) {
    // A race keeps the cookie (the winning request already replaced it); anything else clears it.
    if (err.code !== "REFRESH_RACE") cookies.clear(res);
    // No cookie is the normal "not signed in" check on page load; not worth a warning.
    if (err.code === "NO_SESSION") throw err;
    return logFailure(req, "Refresh")(err);
  }
});

const logout = asyncHandler(async (req, res) => {
  await authService.logout(cookies.read(req));
  cookies.clear(res);
  audit(req, "Logged out");
  res.status(204).end();
});

const logoutAll = asyncHandler(async (req, res) => {
  await authService.logoutAll();
  cookies.clear(res);
  audit(req, "Signed out every session");
  res.status(204).end();
});

const me = (req, res) => res.json({ role: req.user.role, expiresAt: req.user.exp * 1000 });

const changePassword = asyncHandler(async (req, res) => {
  const { tokenVersion, ...tokens } = await authService
    .changePassword(req.body.currentPassword, req.body.newPassword, ctx(req))
    .catch(logFailure(req, "Password change"));
  audit(req, "Password changed; other sessions signed out", { tokenVersion });
  sendTokens(res, tokens);
});

const getSessionSettings = asyncHandler(async (_req, res) => res.json(await authService.getSessionSettings()));

const updateSessionSettings = asyncHandler(async (req, res) => {
  const settings = await authService.updateSessionSettings(req.body);
  audit(req, "Session settings changed", { accessTokenMinutes: settings.accessTokenMinutes, refreshTokenDays: settings.refreshTokenDays });
  res.json(settings);
});

module.exports = { login, refresh, logout, logoutAll, me, changePassword, getSessionSettings, updateSessionSettings };
