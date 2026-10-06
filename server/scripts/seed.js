// Seeds MongoDB from client/src/data/content.json. The server also does this on startup.
//   npm run seed            -> only fills empty collections
//   npm run seed -- --force -> wipes and re-seeds everything
require("dotenv").config();
const logger = require("../src/utils/logger");

(async () => {
  const { connectDB, disconnectDB } = require("../src/db"); // validates .env and logs connection problems with a hint
  const { seedContent } = require("../src/seed");
  await connectDB();
  await seedContent({ force: process.argv.includes("--force") });
  logger.info("Seed finished");
  await disconnectDB();
})().catch((err) => {
  logger.error("Seed failed", { error: err.message });
  setTimeout(() => process.exit(1), 200);
});
