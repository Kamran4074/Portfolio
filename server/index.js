require("dotenv").config();
const logger = require("./src/utils/logger");
require("./src/utils/processHandlers")();

// Validates the environment first, so a bad .env stops here with a clear message.
let env;
try {
  env = require("./src/config/env");
} catch (err) {
  logger.error(err.message);
  setTimeout(() => process.exit(1), 200);
  return;
}

const app = require("./src/app");
const { connectDB, disconnectDB } = require("./src/db");

async function start() {
  await connectDB(); // also auto-seeds empty collections and the initial password
  const server = app.listen(env.PORT, () =>
    logger.info(`Server running on port ${env.PORT}`, { env: env.NODE_ENV, node: process.version })
  );

  const shutdown = (signal) => {
    logger.info(`${signal} received, shutting down`);
    server.close(() => disconnectDB().then(() => process.exit(0)));
    // Do not hang forever on open keep-alive connections.
    setTimeout(() => process.exit(0), 5000).unref();
  };
  process.on("SIGINT", shutdown);
  process.on("SIGTERM", shutdown);
}

start().catch((err) => {
  logger.error("Failed to start", { error: err.message });
  // Give the file transport a moment to flush before exiting.
  setTimeout(() => process.exit(1), 200);
});
