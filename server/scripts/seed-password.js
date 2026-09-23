// Sets (or resets) the settings-page password stored in MongoDB.
// Usage: npm run seed-password -- "your-strong-password"
// Resetting also logs out every open settings session.
require("dotenv").config();
const mongoose = require("mongoose");
const { seedPassword } = require("../src/seed");

const password = process.argv[2];
if (!password || password.length < 10) {
  console.error('Provide a password of at least 10 characters: npm run seed-password -- "your-password"');
  process.exit(1);
}

(async () => {
  await mongoose.connect(process.env.MONGO_URI);
  await seedPassword(password, { force: true });
  await mongoose.disconnect();
})().catch((err) => {
  console.error(err);
  process.exit(1);
});
