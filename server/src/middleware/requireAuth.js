const asyncHandler = require("../core/asyncHandler");
const HttpError = require("../core/HttpError");
const { reqMeta } = require("../core/requestContext");
const authService = require("../modules/auth/auth.service");
const logger = require("../utils/logger");

// Admin-only routes. The token check itself lives in the auth service.
module.exports = asyncHandler(async (req, _res, next) => {
  const header = req.headers.authorization || "";
  const token = header.startsWith("Bearer ") ? header.slice(7) : null;
  if (!token) {
    logger.debug("Auth rejected: no token", reqMeta(req));
    throw new HttpError(401, "Authentication required");
  }
  try {
    req.user = await authService.authenticate(token);
  } catch (err) {
    if (err instanceof HttpError && err.reason) logger.warn(`Auth rejected: ${err.reason}`, reqMeta(req));
    throw err;
  }
  next();
});
