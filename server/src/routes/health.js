const express = require("express");
const mongoose = require("mongoose");
const rateLimit = require("express-rate-limit");
const { Heartbeat } = require("../models");
const { asyncHandler, HttpError } = require("../middleware");
const logger = require("../utils/logger");

const router = express.Router();

// Liveness: is the process up and connected? No database work.
router.get("/", (_req, res) => {
  const db = mongoose.connection.readyState === 1 ? "up" : "down";
  res.status(db === "up" ? 200 : 503).json({ status: db === "up" ? "ok" : "degraded", db, uptime: Math.round(process.uptime()) });
});

// Keep-alive: performs a real write + read on MongoDB so Atlas sees activity and
// never pauses the cluster for inactivity. Called daily by Vercel Cron (server/vercel.json)
// and/or .github/workflows/keep-db-alive.yml.
// If KEEPALIVE_TOKEN is set, callers must send it as ?token= or the x-keepalive-token header.
// Vercel Cron instead sends "Authorization: Bearer <CRON_SECRET>", which is also accepted.
router.get(
  "/db",
  rateLimit({ windowMs: 60 * 60 * 1000, limit: 10, standardHeaders: true, legacyHeaders: false }),
  asyncHandler(async (req, res) => {
    const { KEEPALIVE_TOKEN, CRON_SECRET } = process.env;
    const fromCron = CRON_SECRET && req.get("authorization") === `Bearer ${CRON_SECRET}`;
    if (KEEPALIVE_TOKEN && !fromCron && (req.query.token || req.get("x-keepalive-token")) !== KEEPALIVE_TOKEN) {
      throw new HttpError(401, "Invalid keep-alive token");
    }

    const started = Date.now();
    await mongoose.connection.db.admin().ping();
    const beat = await Heartbeat.findOneAndUpdate(
      { _id: "keepalive" },
      { $set: { lastPing: new Date(), source: String(req.get("user-agent") || "").slice(0, 120) }, $inc: { count: 1 } },
      { upsert: true, new: true }
    ).lean();

    logger.info("DB keep-alive ping", { count: beat.count, ms: Date.now() - started });
    res.json({ status: "ok", db: "up", lastPing: beat.lastPing, pings: beat.count, latencyMs: Date.now() - started });
  })
);

module.exports = router;
