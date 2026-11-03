// express-rate-limit store backed by MongoDB, so a limit holds across every serverless
// instance (the default memory store counts per instance). Used for the security-relevant
// limiters (login, refresh, contact, upload); high-volume ones stay in memory.
// If the database is not connected or a query fails, it falls back to an in-memory count
// for that request rather than blocking or failing it.
const { MemoryStore } = require("express-rate-limit");
const mongoose = require("mongoose");
const { RateLimit } = require("../models");
const logger = require("../utils/logger");

class MongoRateLimitStore {
  constructor(prefix) {
    this.prefix = `${prefix}:`;
    this.fallback = new MemoryStore();
    this.localKeys = false;
  }

  init(options) {
    this.windowMs = options.windowMs;
    this.fallback.init(options);
  }

  get usable() {
    return mongoose.connection.readyState === 1;
  }

  async increment(key) {
    if (!this.usable) return this.fallback.increment(key);
    const id = this.prefix + key;
    const now = new Date();
    try {
      // Count within the current window; start a new window when there is none or it ended.
      let doc = await RateLimit.findOneAndUpdate({ _id: id, resetAt: { $gt: now } }, { $inc: { hits: 1 } }, { new: true }).lean();
      if (!doc) {
        doc = await RateLimit.findOneAndUpdate(
          { _id: id },
          { $set: { hits: 1, resetAt: new Date(now.getTime() + this.windowMs) } },
          { upsert: true, new: true }
        ).lean();
      }
      return { totalHits: doc.hits, resetTime: doc.resetAt };
    } catch (err) {
      logger.warn("rate limit store: database error, counting in memory", { error: err.message });
      return this.fallback.increment(key);
    }
  }

  async decrement(key) {
    if (!this.usable) return this.fallback.decrement(key);
    await RateLimit.updateOne({ _id: this.prefix + key, hits: { $gt: 0 } }, { $inc: { hits: -1 } }).catch(() => {});
  }

  async resetKey(key) {
    await this.fallback.resetKey(key);
    if (this.usable) await RateLimit.deleteOne({ _id: this.prefix + key }).catch(() => {});
  }
}

module.exports = MongoRateLimitStore;
