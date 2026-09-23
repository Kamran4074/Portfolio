// Seeds MongoDB from client/src/data/content.json. The server also does this on startup.
//   npm run seed            -> only fills empty collections
//   npm run seed -- --force -> wipes and re-seeds everything
require("dotenv").config();
const mongoose = require("mongoose");
const { seedContent } = require("../src/seed");

(async () => {
  await mongoose.connect(process.env.MONGO_URI);
  await seedContent({ force: process.argv.includes("--force") });
  console.log("done");
  await mongoose.disconnect();
})().catch((err) => {
  console.error(err);
  process.exit(1);
});
