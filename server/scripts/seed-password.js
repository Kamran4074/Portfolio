// Sets (or resets) the settings-page password stored in MongoDB.
// Usage: npm run seed-password -- "your-strong-password"
// Resetting also logs out every open settings session.
require("dotenv").config();
const logger = require("../src/utils/logger");

const password = process.argv[2];
if (!password || password.length < 10) {
  logger.error('Provide a password of at least 10 characters: npm run seed-password -- "your-password"');
  process.exit(1);
}

(async () => {
  const { connectDB, disconnectDB } = require("../src/db");
  const { seedPassword } = require("../src/seed");
  await connectDB();
  await seedPassword(password, { force: true });
  await disconnectDB();
})().catch((err) => {
  logger.error("Setting the password failed", { error: err.message });
  setTimeout(() => process.exit(1), 200);
});
