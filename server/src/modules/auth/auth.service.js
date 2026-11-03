// Settings-page authentication: one admin password, short-lived JWTs.
// Changing the password bumps tokenVersion, which signs out every older token.
const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");
const HttpError = require("../../core/HttpError");
const repo = require("./auth.repository");
const env = require("../../config/env");

const TOKEN_TTL = "2h";
const BCRYPT_ROUNDS = 12;

const signToken = (tokenVersion) =>
  jwt.sign({ sub: "admin", role: "admin", tv: tokenVersion }, env.JWT_SECRET, { expiresIn: TOKEN_TTL });

// The password lives in MongoDB (set with `npm run seed-password`).
// ADMIN_PASSWORD_HASH in .env is only a fallback until it has been seeded.
async function currentHash() {
  const setting = await repo.getSetting();
  return { hash: setting?.passwordHash || env.ADMIN_PASSWORD_HASH, tokenVersion: setting?.tokenVersion ?? 0 };
}

async function login(password) {
  if (!env.JWT_SECRET) throw new HttpError(503, "Settings login is not configured (JWT_SECRET missing)");
  const { hash, tokenVersion } = await currentHash();
  if (!hash) {
    throw new HttpError(503, 'No password set. Run: npm run seed-password -- "your-password"', { reason: "no password set" });
  }
  // Security signal: repeated failures from one IP mean someone is guessing.
  if (!(await bcrypt.compare(password, hash))) throw new HttpError(401, "Wrong password", { reason: "wrong password" });
  return signToken(tokenVersion);
}

// Returns a fresh token for this session; every other session is signed out.
async function changePassword(currentPassword, newPassword) {
  const { hash, tokenVersion } = await currentHash();
  if (!hash || !(await bcrypt.compare(currentPassword, hash))) {
    throw new HttpError(400, "Current password is wrong", { reason: "current password wrong" });
  }
  const next = tokenVersion + 1;
  await repo.savePassword(await bcrypt.hash(newPassword, BCRYPT_ROUNDS), next);
  return { token: signToken(next), tokenVersion: next };
}

// Verifies a bearer token. Throws 401 with a log-only reason.
async function authenticate(token) {
  let payload;
  try {
    payload = jwt.verify(token, env.JWT_SECRET);
  } catch (err) {
    throw new HttpError(401, "Invalid or expired token", { reason: err.name === "TokenExpiredError" ? "token expired" : "invalid token" });
  }
  if (payload.role !== "admin") throw new HttpError(401, "Invalid or expired token", { reason: "wrong role" });
  // Tokens issued before the last password change are rejected.
  if ((await repo.getTokenVersion()) !== (payload.tv ?? 0)) {
    throw new HttpError(401, "Session expired, please log in again", { reason: "token from before a password change" });
  }
  return payload;
}

module.exports = { signToken, login, changePassword, authenticate };
