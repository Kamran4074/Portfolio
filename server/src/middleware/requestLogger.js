// HTTP access log: morgan formats each request, winston writes it (level "http").
const morgan = require("morgan");
const logger = require("../utils/logger");

const format = process.env.NODE_ENV === "production"
  ? ":remote-addr :method :url :status :res[content-length] - :response-time ms \":user-agent\""
  : ":method :url :status :response-time ms";

module.exports = morgan(format, {
  stream: { write: (line) => logger.http(line.trim()) },
  // Uptime pings to /api/health would flood the log.
  skip: (req, res) => req.originalUrl === "/api/health" && res.statusCode < 400,
});
