// Sets (or resets) the settings-page password stored in MongoDB.
// Usage: npm run seed-password -- "your-strong-password"
// Resetting also logs out every open settings session.
require("dotenv").config();
const bcrypt = require("bcryptjs");
const mongoose = require("mongoose");
const { Setting } = require("../src/models");

const password = process.argv[2];
if (!password || password.length < 10) {
  console.error('Provide a password of at least 10 characters: npm run seed-password -- "your-password"');
  process.exit(1);
}

(async () => {
  await mongoose.connect(process.env.MONGO_URI);
  const existing = await Setting.findOne().lean();
  await Setting.findOneAndUpdate(
    {},
    { passwordHash: await bcrypt.hash(password, 12), tokenVersion: (existing?.tokenVersion ?? 0) + 1 },
    { upsert: true }
  );
  console.log(existing ? "Password updated." : "Password seeded.");
  await mongoose.disconnect();
})().catch((err) => {
  console.error(err);
  process.exit(1);
});
