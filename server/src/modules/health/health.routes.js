//   GET /api/health      public; liveness, no DB work
//   GET /api/health/db   public (or token); real DB write + read, 10 / hour
const express = require("express");
const asyncHandler = require("../../core/asyncHandler");
const { reqMeta } = require("../../core/requestContext");
const { validate, rateLimit } = require("../../middleware");
const { z } = require("../../validators/common");
const service = require("./health.service");
const logger = require("../../utils/logger");

const keepAliveQuery = z.object({ token: z.string().max(200).optional() });

const router = express.Router();

router.get("/", (_req, res) => {
  const body = service.liveness();
  res.status(body.db === "up" ? 200 : 503).json(body);
});

router.get(
  "/db",
  rateLimit.keepAlive,
  validate(keepAliveQuery, "query"),
  asyncHandler(async (req, res) => {
    try {
      service.assertKeepAliveAllowed({ token: req.query.token || req.get("x-keepalive-token"), authorization: req.get("authorization") });
    } catch (err) {
      logger.warn("Keep-alive rejected: bad token", reqMeta(req));
      throw err;
    }
    const beat = await service.keepAlive(req.get("user-agent"));
    logger.info("DB keep-alive ping", { count: beat.pings, ms: beat.latencyMs });
    res.json({ status: "ok", db: "up", ...beat });
  })
);

module.exports = router;
