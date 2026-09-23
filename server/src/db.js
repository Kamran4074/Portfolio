// One MongoDB connection per process. On Vercel each serverless instance reuses it
// across requests, and auto-seed runs once per cold start (it never overwrites data).
const mongoose = require("mongoose");
const { autoSeed } = require("./seed");
const logger = require("./utils/logger");

let connecting = null;

function connectDB() {
  if (!connecting) {
    connecting = mongoose
      .connect(process.env.MONGO_URI, { serverSelectionTimeoutMS: 10000 })
      .then(async () => {
        logger.info("MongoDB connected");
        await autoSeed().catch((err) => logger.error("Auto-seed failed", { error: err.message }));
      })
      .catch((err) => {
        connecting = null; // let the next request retry
        throw err;
      });
  }
  return connecting;
}

module.exports = { connectDB };
