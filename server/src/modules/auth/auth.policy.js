// Session lifetimes. Defaults apply until changed from the Security tab in /settings;
// the limits keep a typo from creating a 1-second or 10-year session.
module.exports = {
  accessTokenMinutes: { default: 15, min: 5, max: 120 },
  refreshTokenDays: { default: 7, min: 1, max: 30 },
  // A refresh token reused within this window right after rotation is two tabs refreshing
  // at once, not theft: answer 401 REFRESH_RACE (the client retries with the new cookie).
  ROTATION_GRACE_MS: 10 * 1000,
  COOKIE_NAME: "refresh_token",
  COOKIE_PATH: "/api/auth", // the cookie is only sent to the auth endpoints
};
