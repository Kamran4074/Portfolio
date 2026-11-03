// The refresh-token cookie: HttpOnly (page scripts cannot read it), Secure in production,
// limited to /api/auth so it is never sent with ordinary API calls.
const policy = require("./auth.policy");
const env = require("../../config/env");

const sameSite = env.REFRESH_COOKIE_SAMESITE || "lax";

const options = (expires) => ({
  httpOnly: true,
  // SameSite=None is only accepted on Secure cookies; browsers treat localhost as secure.
  secure: env.isProd || sameSite === "none",
  sameSite,
  path: policy.COOKIE_PATH,
  ...(expires && { expires }),
});

const set = (res, token, expires) => res.cookie(policy.COOKIE_NAME, token, options(expires));

const clear = (res) => res.clearCookie(policy.COOKIE_NAME, options());

// Reads one cookie from the Cookie header (no cookie-parser dependency needed).
function read(req) {
  for (const part of String(req.headers.cookie || "").split(";")) {
    const i = part.indexOf("=");
    if (i > 0 && part.slice(0, i).trim() === policy.COOKIE_NAME) {
      try {
        return decodeURIComponent(part.slice(i + 1).trim());
      } catch {
        return null;
      }
    }
  }
  return null;
}

module.exports = { set, clear, read, options };
