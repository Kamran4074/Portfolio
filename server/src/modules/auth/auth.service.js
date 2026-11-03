// Settings-page authentication with access + refresh tokens.
//
//   access token   JWT, short-lived (default 15 min). The settings page keeps it in
//                  localStorage and sends it as "Authorization: Bearer". Carries tokenVersion,
//                  so a password change or "sign out everywhere" invalidates it immediately.
//   refresh token  random 256-bit value, longer-lived (default 7 days), in an HttpOnly cookie
//                  the page's JavaScript cannot read. Stored only as a SHA-256 hash.
//                  Rotated on every use; reusing an old one revokes that whole login (family).
//
// Lifetimes come from the settings document (Security tab), within auth.policy limits.
const crypto = require("crypto");
const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");
const HttpError = require("../../core/HttpError");
const repo = require("./auth.repository");
const policy = require("./auth.policy");
const env = require("../../config/env");

const BCRYPT_ROUNDS = 12;
const MIN = 60 * 1000;
const DAY = 24 * 60 * MIN;

const unauthorized = (message, reason, code) => new HttpError(401, message, { reason, code });

const clamp = (value, { default: d, min, max }) => (Number.isFinite(value) ? Math.min(max, Math.max(min, value)) : d);

// Current session lifetimes (defaults until changed in the Security tab).
const sessionSettingsFrom = (setting) => ({
  accessTokenMinutes: clamp(setting?.accessTokenMinutes, policy.accessTokenMinutes),
  refreshTokenDays: clamp(setting?.refreshTokenDays, policy.refreshTokenDays),
});

const hashToken = (raw) => crypto.createHash("sha256").update(raw).digest("hex");
const newRefreshToken = () => crypto.randomBytes(32).toString("base64url");

const signAccessToken = (tokenVersion, minutes = policy.accessTokenMinutes.default) =>
  jwt.sign({ sub: "admin", role: "admin", typ: "access", tv: tokenVersion }, env.JWT_SECRET, { algorithm: "HS256", expiresIn: minutes * 60 });

// Issues an access token and a new refresh token (a new family unless one is given).
async function issueTokens(setting, { family = crypto.randomUUID(), refreshToken = newRefreshToken(), ip, userAgent } = {}) {
  const { accessTokenMinutes, refreshTokenDays } = sessionSettingsFrom(setting);
  const tokenVersion = setting?.tokenVersion ?? 0;
  const refreshExpiresAt = new Date(Date.now() + refreshTokenDays * DAY);
  await repo.createSession({
    tokenHash: hashToken(refreshToken),
    family,
    tokenVersion,
    expiresAt: refreshExpiresAt,
    ip,
    userAgent: String(userAgent || "").slice(0, 200),
  });
  return {
    accessToken: signAccessToken(tokenVersion, accessTokenMinutes),
    expiresIn: accessTokenMinutes * 60,
    refreshToken,
    refreshExpiresAt,
  };
}

// The password lives in MongoDB (set with `npm run seed-password`).
// ADMIN_PASSWORD_HASH in .env is only a fallback until it has been seeded.
async function currentSetting() {
  const setting = await repo.getSetting();
  return { setting, hash: setting?.passwordHash || env.ADMIN_PASSWORD_HASH };
}

async function login(password, ctx) {
  if (!env.JWT_SECRET) throw new HttpError(503, "Settings login is not configured (JWT_SECRET missing)");
  const { setting, hash } = await currentSetting();
  if (!hash) {
    throw new HttpError(503, 'No password set. Run: npm run seed-password -- "your-password"', { reason: "no password set" });
  }
  // Security signal: repeated failures from one IP mean someone is guessing.
  if (!(await bcrypt.compare(password, hash))) throw unauthorized("Wrong password", "wrong password");
  return issueTokens(setting, ctx);
}

// Exchanges a refresh token for a new access token and a new (rotated) refresh token.
async function refresh(rawToken, ctx) {
  if (!rawToken) throw unauthorized("Not signed in", "no refresh token", "NO_SESSION");
  const session = await repo.findSessionByHash(hashToken(rawToken));
  if (!session) throw unauthorized("Session expired, please log in again", "unknown refresh token", "SESSION_EXPIRED");

  if (session.revokedAt) {
    const justRotated = session.replacedBy && Date.now() - new Date(session.revokedAt).getTime() < policy.ROTATION_GRACE_MS;
    if (justRotated) throw unauthorized("Refresh already in progress", "rotation race", "REFRESH_RACE");
    // A rotated token came back: someone else may hold a copy. End that whole login.
    await repo.revokeFamily(session.family);
    throw unauthorized("Session expired, please log in again", "refresh token reuse: session revoked", "SESSION_EXPIRED");
  }
  if (new Date(session.expiresAt) <= new Date()) throw unauthorized("Session expired, please log in again", "refresh token expired", "SESSION_EXPIRED");

  const setting = await repo.getSetting();
  if ((setting?.tokenVersion ?? 0) !== session.tokenVersion) {
    await repo.revokeFamily(session.family);
    throw unauthorized("Session expired, please log in again", "refresh token from before a password change", "SESSION_EXPIRED");
  }

  // Claim the old token first (atomic), so of two simultaneous requests only one issues
  // new tokens; the other gets REFRESH_RACE and retries with the winner's cookie.
  const refreshToken = newRefreshToken();
  if (!(await repo.rotateSession(session._id, hashToken(refreshToken)))) {
    throw unauthorized("Refresh already in progress", "rotation race", "REFRESH_RACE");
  }
  return issueTokens(setting, { ...ctx, family: session.family, refreshToken });
}

// Ends this login (the whole refresh-token family).
async function logout(rawToken) {
  if (!rawToken) return;
  const session = await repo.findSessionByHash(hashToken(rawToken));
  if (session) await repo.revokeFamily(session.family);
}

// Signs out every session, including this one's access token.
async function logoutAll() {
  await repo.bumpTokenVersion();
  await repo.revokeAllSessions();
}

// New password: every other session is signed out; this one gets fresh tokens.
async function changePassword(currentPassword, newPassword, ctx) {
  const { setting, hash } = await currentSetting();
  if (!hash || !(await bcrypt.compare(currentPassword, hash))) {
    throw new HttpError(400, "Current password is wrong", { reason: "current password wrong" });
  }
  const tokenVersion = (setting?.tokenVersion ?? 0) + 1;
  const saved = await repo.savePassword(await bcrypt.hash(newPassword, BCRYPT_ROUNDS), tokenVersion);
  await repo.revokeAllSessions();
  return { ...(await issueTokens(saved, ctx)), tokenVersion };
}

// Verifies an access token. Throws 401 with a log-only reason.
async function authenticate(token) {
  let payload;
  try {
    payload = jwt.verify(token, env.JWT_SECRET, { algorithms: ["HS256"] });
  } catch (err) {
    const expired = err.name === "TokenExpiredError";
    throw unauthorized("Invalid or expired token", expired ? "token expired" : "invalid token", expired ? "TOKEN_EXPIRED" : undefined);
  }
  if (payload.role !== "admin" || payload.typ !== "access") throw unauthorized("Invalid or expired token", "wrong token type");
  // Tokens issued before the last password change (or "sign out everywhere") are rejected.
  if ((await repo.getTokenVersion()) !== (payload.tv ?? 0)) {
    throw unauthorized("Session expired, please log in again", "token from before a password change", "SESSION_EXPIRED");
  }
  return payload;
}

async function getSessionSettings() {
  const [setting, activeSessions] = await Promise.all([repo.getSetting(), repo.countActiveSessions()]);
  return { ...sessionSettingsFrom(setting), activeSessions, limits: { accessTokenMinutes: policy.accessTokenMinutes, refreshTokenDays: policy.refreshTokenDays } };
}

// New lifetimes apply to tokens issued from now on; existing ones keep their expiry.
async function updateSessionSettings(values) {
  await repo.saveSessionSettings(values);
  return getSessionSettings();
}

module.exports = {
  signAccessToken,
  hashToken,
  login,
  refresh,
  logout,
  logoutAll,
  changePassword,
  authenticate,
  getSessionSettings,
  updateSessionSettings,
};
