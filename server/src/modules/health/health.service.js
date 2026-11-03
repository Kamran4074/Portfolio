const mongoose = require("mongoose");
const { Heartbeat } = require("../../models");
const HttpError = require("../../core/HttpError");
const env = require("../../config/env");

// Liveness: is the process up and connected? No database work.
function liveness() {
  const up = mongoose.connection.readyState === 1;
  return { status: up ? "ok" : "degraded", db: up ? "up" : "down", uptime: Math.round(process.uptime()) };
}

// If KEEPALIVE_TOKEN is set, callers must send it as ?token= or the x-keepalive-token header.
// Vercel Cron instead sends "Authorization: Bearer <CRON_SECRET>", which is also accepted.
function assertKeepAliveAllowed({ token, authorization }) {
  const { KEEPALIVE_TOKEN, CRON_SECRET } = env;
  const fromCron = CRON_SECRET && authorization === `Bearer ${CRON_SECRET}`;
  if (KEEPALIVE_TOKEN && !fromCron && token !== KEEPALIVE_TOKEN) {
    throw new HttpError(401, "Invalid keep-alive token", { reason: "bad token" });
  }
}

// Keep-alive: a real write + read on MongoDB so Atlas sees activity and never pauses the
// cluster for inactivity. Called daily by Vercel Cron and/or the GitHub Actions workflow.
async function keepAlive(source = "") {
  const started = Date.now();
  await mongoose.connection.db.admin().ping();
  const beat = await Heartbeat.findOneAndUpdate(
    { _id: "keepalive" },
    { $set: { lastPing: new Date(), source: String(source).slice(0, 120) }, $inc: { count: 1 } },
    { upsert: true, new: true }
  ).lean();
  return { lastPing: beat.lastPing, pings: beat.count, latencyMs: Date.now() - started };
}

module.exports = { liveness, assertKeepAliveAllowed, keepAlive };
