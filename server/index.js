require("dotenv").config();
const mongoose = require("mongoose");
const app = require("./src/app");
const { connectDB } = require("./src/db");
const logger = require("./src/utils/logger");

const PORT = process.env.PORT || 5000;

async function start() {
  if (!process.env.JWT_SECRET) logger.warn("JWT_SECRET is not set: settings login is disabled.");
  await connectDB(); // also auto-seeds empty collections and the initial password
  const server = app.listen(PORT, () => logger.info(`Server running on port ${PORT}`));

  const shutdown = (signal) => {
    logger.info(`${signal} received, shutting down`);
    server.close(() => mongoose.disconnect().then(() => process.exit(0)));
  };
  process.on("SIGINT", shutdown);
  process.on("SIGTERM", shutdown);
}

start().catch((err) => {
  logger.error("Failed to start", { error: err.message, stack: err.stack });
  // Give the file transport a moment to flush before exiting.
  setTimeout(() => process.exit(1), 200);
});
