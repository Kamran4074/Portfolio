// Cross-cutting HTTP middleware, in one import.
const validate = require("./validate");
const requireAuth = require("./requireAuth");
const rateLimit = require("./rateLimit");
const requestLogger = require("./requestLogger");
const { notFound, errorHandler } = require("./errorHandler");

module.exports = { validate, requireAuth, rateLimit, requestLogger, notFound, errorHandler };
