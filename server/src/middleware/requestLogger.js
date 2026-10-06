// HTTP access logging: morgan measures each request, winston writes it (level "http").
//
// Every request gets an id (reused from an incoming X-Request-Id, e.g. from a proxy, or
// generated). It is sent back in the X-Request-Id response header and attached to the
// access line and to any error logged for that request, so one grep finds everything.
//
// Dev:  "GET /api/content 200 12.3 ms #a1b2c3d4"
// Prod: structured fields (method, url, status, ms, ip, ua, reqId) for log search.
const crypto = require("crypto");
const morgan = require("morgan");
const logger = require("../utils/logger");
const { isProd } = require("../config/env");

const assignId = (req, res, next) => {
  const incoming = req.get("x-request-id");
  req.id = incoming && /^[\w-]{8,64}$/.test(incoming) ? incoming : crypto.randomUUID();
  res.set("X-Request-Id", req.id);
  next();
};

morgan.token("id", (req) => req.id);

// Morgan calls this per request; returning JSON lets the stream hand winston real fields.
const jsonFormat = (tokens, req, res) =>
  JSON.stringify({
    method: tokens.method(req, res),
    url: tokens.url(req, res),
    status: Number(tokens.status(req, res)) || 0,
    ms: Number(tokens["response-time"](req, res)) || 0,
    bytes: Number(tokens.res(req, res, "content-length")) || 0,
    ip: tokens["remote-addr"](req, res),
    ua: tokens["user-agent"](req, res),
    reqId: req.id,
  });

const devFormat = (tokens, req, res) =>
  JSON.stringify({
    text: `${tokens.method(req, res)} ${tokens.url(req, res)} ${tokens.status(req, res)} ${tokens["response-time"](req, res)} ms #${String(req.id).slice(0, 8)}`,
    status: Number(tokens.status(req, res)) || 0,
  });

const access = morgan(isProd ? jsonFormat : devFormat, {
  stream: {
    write: (line) => {
      const { text, ...fields } = JSON.parse(line);
      // 5xx are already logged as errors by the error handler; 4xx are worth a closer look.
      const level = fields.status >= 500 ? "error" : fields.status >= 400 ? "warn" : "http";
      if (text) logger.log(level, text);
      else logger.log(level, "request", fields);
    },
  },
  // Uptime pings to /api/health would flood the log.
  skip: (req, res) => req.originalUrl === "/api/health" && res.statusCode < 400,
});

module.exports = [assignId, access];
